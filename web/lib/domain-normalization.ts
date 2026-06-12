import psl from "psl";

/** Strip protocol, path, and www; preserve subdomain (no PSL root collapse). */
export function normalizeDomainHost(input: string): string {
  let domain = input.trim();
  if (!domain) return "";

  domain = domain.replace(/^https?:\/\//i, "");
  domain = domain.split("/")[0] ?? "";
  domain = domain.split("?")[0] ?? "";
  domain = domain.split("#")[0] ?? "";
  domain = domain.split(":")[0] ?? "";
  domain = domain.replace(/^www\./i, "");

  return domain.toLowerCase();
}

/** Strip protocol, path, and www; return registrable root domain via PSL. */
export function normalizeDomain(input: string): string {
  let domain = input.trim();
  if (!domain) return "";

  domain = domain.replace(/^https?:\/\//i, "");

  domain = domain.split("/")[0] ?? "";
  domain = domain.split("?")[0] ?? "";
  domain = domain.split("#")[0] ?? "";
  domain = domain.split(":")[0] ?? "";

  domain = domain.replace(/^www\./i, "");
  domain = domain.toLowerCase();

  const parsed = psl.parse(domain);
  if (parsed && "domain" in parsed && parsed.domain) {
    return parsed.domain;
  }

  return domain;
}

export function getRootDomain(url: string): string {
  return normalizeDomain(url);
}

/** Group multiple subdomains under the same registrable root domain. */
export function getDomainGroupKey(url: string): string {
  return normalizeDomain(url);
}
