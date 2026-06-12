"""Rules-first HTTP crawl for Phase 1 Audit Agent — no LLM required."""

from __future__ import annotations

import os
import re
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

USER_AGENT = "Mozilla/5.0 (compatible; AISearchOS-AuditBot/1.0)"
DEFAULT_TIMEOUT_SEC = 10
DEFAULT_MAX_PAGES = 5

_KEY_PATHS = (
    "",
    "/about",
    "/about-us",
    "/contact",
    "/contact-us",
    "/faq",
    "/privacy",
    "/privacy-policy",
)

_META_RE = re.compile(
    r'<meta\s+(?:[^>]*?\s)?(?:name|property)=["\']([^"\']+)["\']\s+'
    r'(?:[^>]*?\s)?content=["\']([^"\']*)["\']',
    re.IGNORECASE,
)
_META_CONTENT_FIRST_RE = re.compile(
    r'<meta\s+(?:[^>]*?\s)?content=["\']([^"\']*)["\']\s+'
    r'(?:[^>]*?\s)?(?:name|property)=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_CANONICAL_RE = re.compile(
    r'<link\s+[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_CANONICAL_HREF_FIRST_RE = re.compile(
    r'<link\s+[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']',
    re.IGNORECASE,
)
_HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.IGNORECASE)


def _env_int(name: str, default: int, *, minimum: int = 1) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        return max(minimum, int(raw))
    except ValueError:
        return default


def crawl_timeout_sec() -> float:
    return float(_env_int("AUDIT_CRAWL_TIMEOUT_SEC", DEFAULT_TIMEOUT_SEC, minimum=3))


def crawl_max_pages() -> int:
    return _env_int("AUDIT_CRAWL_MAX_PAGES", DEFAULT_MAX_PAGES, minimum=1)


def normalize_site_url(site_url: str) -> str:
    raw = (site_url or "").strip()
    if not raw:
        raise ValueError("site_url is required")
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    if not parsed.netloc:
        raise ValueError(f"Invalid site URL: {site_url}")
    scheme = parsed.scheme.lower() if parsed.scheme else "https"
    if scheme not in ("http", "https"):
        raise ValueError(f"Unsupported URL scheme: {parsed.scheme}")
    path = parsed.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return f"{scheme}://{parsed.netloc.lower()}{path or '/'}"


def _origin(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc.lower()}"


def _same_host(base_url: str, candidate: str) -> bool:
    return urlparse(base_url).netloc.lower() == urlparse(candidate).netloc.lower()


def _candidate_urls(home_url: str, max_pages: int) -> list[str]:
    origin = _origin(home_url)
    seen: set[str] = set()
    urls: list[str] = []
    for path in _KEY_PATHS:
        joined = urljoin(f"{origin}/", path.lstrip("/")) if path else origin + "/"
        normalized = normalize_site_url(joined)
        if normalized in seen:
            continue
        seen.add(normalized)
        urls.append(normalized)
        if len(urls) >= max_pages:
            break
    return urls


def _strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html)


def _meta_tags(html: str) -> dict[str, str]:
    tags: dict[str, str] = {}
    for match in _META_RE.finditer(html):
        tags[match.group(1).lower()] = match.group(2).strip()
    for match in _META_CONTENT_FIRST_RE.finditer(html):
        tags[match.group(2).lower()] = match.group(1).strip()
    return tags


def _canonical_url(html: str) -> str:
    match = _CANONICAL_RE.search(html)
    if match:
        return match.group(1).strip()
    match = _CANONICAL_HREF_FIRST_RE.search(html)
    if match:
        return match.group(1).strip()
    return ""


class _HeadingListCounter(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.h1_count = 0
        self.h1_texts: list[str] = []
        self.heading_count = 0
        self.list_count = 0
        self._in_h1 = False
        self._h1_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if tag_lower == "h1":
            self.h1_count += 1
            self.heading_count += 1
            self._in_h1 = True
            self._h1_buffer = []
        elif tag_lower in ("h2", "h3", "h4", "h5", "h6"):
            self.heading_count += 1
        elif tag_lower in ("ul", "ol"):
            self.list_count += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "h1" and self._in_h1:
            text = " ".join(self._h1_buffer).strip()
            if text:
                self.h1_texts.append(text)
            self._in_h1 = False
            self._h1_buffer = []

    def handle_data(self, data: str) -> None:
        if self._in_h1:
            self._h1_buffer.append(data.strip())


def _count_outbound_ref_domains(html: str, page_url: str) -> int:
    domains: set[str] = set()
    page_host = urlparse(page_url).netloc.lower()
    for match in _HREF_RE.finditer(html):
        href = match.group(1).strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        absolute = urljoin(page_url, href)
        host = urlparse(absolute).netloc.lower()
        if host and host != page_host:
            domains.add(host)
    return len(domains)


def _has_faq_block(html: str) -> bool:
    lowered = html.lower()
    if "faqpage" in lowered or "@type" in lowered and "faq" in lowered:
        return True
    return bool(re.search(r'class=["\'][^"\']*faq[^"\']*["\']', lowered))


def _has_author_byline(html: str) -> bool:
    lowered = html.lower()
    return (
        'rel="author"' in lowered
        or "byline" in lowered
        or re.search(r'class=["\'][^"\']*author[^"\']*["\']', lowered) is not None
    )


def _links_to_about(html: str, page_url: str) -> bool:
    for match in _HREF_RE.finditer(html):
        href = match.group(1).strip().lower()
        if "/about" in href or "about-us" in href or "about_us" in href:
            return True
    return False


def _has_contact_signals(html: str) -> bool:
    lowered = html.lower()
    return (
        "mailto:" in lowered
        or "tel:" in lowered
        or re.search(r'href=["\'][^"\']*contact[^"\']*["\']', lowered) is not None
    )


def _has_privacy_policy_link(html: str) -> bool:
    lowered = html.lower()
    return "/privacy" in lowered or "privacy-policy" in lowered or "privacy_policy" in lowered


def parse_page_html(html: str, *, url: str, status_code: int, response_time_ms: int) -> dict[str, Any]:
    meta = _meta_tags(html)
    title_match = _TITLE_RE.search(html)
    title = re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else ""

    counter = _HeadingListCounter()
    try:
        counter.feed(html)
    except Exception:
        pass

    text = _strip_tags(html)
    word_count = len(re.findall(r"\b\w+\b", text))

    og_keys = {k for k in meta if k.startswith("og:")}
    has_open_graph = bool(og_keys)

    parsed_url = urlparse(url)
    return {
        "url": url,
        "status_code": status_code,
        "fetch_error": None,
        "response_time_ms": response_time_ms,
        "title": title,
        "meta_description": meta.get("description", ""),
        "h1_count": counter.h1_count,
        "h1_text": counter.h1_texts[0] if counter.h1_texts else "",
        "canonical": _canonical_url(html),
        "robots_meta": meta.get("robots", ""),
        "has_json_ld": "application/ld+json" in html.lower(),
        "has_open_graph": has_open_graph,
        "og_title": meta.get("og:title", ""),
        "og_description": meta.get("og:description", ""),
        "word_count": word_count,
        "heading_count": counter.heading_count,
        "list_count": counter.list_count,
        "has_faq_block": _has_faq_block(html),
        "outbound_ref_domains": _count_outbound_ref_domains(html, url),
        "has_author_byline": _has_author_byline(html),
        "links_to_about": _links_to_about(html, url),
        "is_https": parsed_url.scheme.lower() == "https",
        "has_contact_signals": _has_contact_signals(html),
        "has_privacy_policy_link": _has_privacy_policy_link(html),
    }


def _failed_page(
    url: str,
    *,
    status_code: int | None = None,
    fetch_error: str,
    response_time_ms: int = 0,
) -> dict[str, Any]:
    parsed_url = urlparse(url)
    return {
        "url": url,
        "status_code": status_code,
        "fetch_error": fetch_error,
        "response_time_ms": response_time_ms,
        "title": "",
        "meta_description": "",
        "h1_count": 0,
        "h1_text": "",
        "canonical": "",
        "robots_meta": "",
        "has_json_ld": False,
        "has_open_graph": False,
        "og_title": "",
        "og_description": "",
        "word_count": 0,
        "heading_count": 0,
        "list_count": 0,
        "has_faq_block": False,
        "outbound_ref_domains": 0,
        "has_author_byline": False,
        "links_to_about": False,
        "is_https": parsed_url.scheme.lower() == "https",
        "has_contact_signals": False,
        "has_privacy_policy_link": False,
    }


async def _fetch_page(
    client: httpx.AsyncClient,
    url: str,
    *,
    timeout_sec: float,
) -> dict[str, Any]:
    import time

    started = time.perf_counter()
    try:
        response = await client.get(
            url,
            follow_redirects=True,
            timeout=timeout_sec,
        )
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        content_type = (response.headers.get("content-type") or "").lower()
        if response.status_code >= 400:
            return _failed_page(
                str(response.url),
                status_code=response.status_code,
                fetch_error=f"HTTP {response.status_code}",
                response_time_ms=elapsed_ms,
            )
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return _failed_page(
                str(response.url),
                status_code=response.status_code,
                fetch_error=f"Non-HTML content-type: {content_type or 'unknown'}",
                response_time_ms=elapsed_ms,
            )
        html = response.text
        return parse_page_html(
            html,
            url=str(response.url),
            status_code=response.status_code,
            response_time_ms=elapsed_ms,
        )
    except httpx.TimeoutException:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        return _failed_page(url, fetch_error="Request timed out", response_time_ms=elapsed_ms)
    except httpx.HTTPError as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        return _failed_page(url, fetch_error=str(exc), response_time_ms=elapsed_ms)


def _page_summary(page: dict[str, Any]) -> dict[str, Any]:
    return {
        "url": page.get("url"),
        "status_code": page.get("status_code"),
        "fetch_error": page.get("fetch_error"),
        "response_time_ms": page.get("response_time_ms"),
        "title": page.get("title"),
        "meta_description": page.get("meta_description"),
        "h1_count": page.get("h1_count"),
        "h1_text": page.get("h1_text"),
        "canonical": page.get("canonical"),
        "robots_meta": page.get("robots_meta"),
        "has_json_ld": page.get("has_json_ld"),
        "has_open_graph": page.get("has_open_graph"),
        "is_https": page.get("is_https"),
        "word_count": page.get("word_count"),
    }


async def crawl(site_url: str) -> dict[str, Any]:
    """
    Shallow rules-first crawl: homepage plus key paths on the same host.
    Never raises on fetch failure — returns partial pages + crawl summary.
    """
    home_url = normalize_site_url(site_url)
    timeout_sec = crawl_timeout_sec()
    max_pages = crawl_max_pages()
    targets = _candidate_urls(home_url, max_pages)

    pages: list[dict[str, Any]] = []
    errors: list[dict[str, str | int | None]] = []

    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    async with httpx.AsyncClient(headers=headers, verify=True) as client:
        for url in targets:
            if not _same_host(home_url, url):
                continue
            page = await _fetch_page(client, url, timeout_sec=timeout_sec)
            pages.append(page)
            if page.get("fetch_error"):
                errors.append(
                    {
                        "url": page.get("url") or url,
                        "status_code": page.get("status_code"),
                        "error": str(page.get("fetch_error")),
                    }
                )
            if url == home_url and page.get("fetch_error"):
                break

    successful = [p for p in pages if not p.get("fetch_error")]
    return {
        "pages": pages,
        "summary": {
            "site_url": home_url,
            "pages_attempted": len(pages),
            "pages_fetched": len(successful),
            "timeout_sec": timeout_sec,
            "max_pages": max_pages,
            "errors": errors,
            "pages": [_page_summary(p) for p in pages],
        },
    }
