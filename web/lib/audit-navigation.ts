export type AuditUrlParams = {
  clientId?: string;
  domain?: string | null;
  brandName?: string | null;
};

/** Build /audit URL with optional client context for agency workflows. */
export function buildAuditUrl(params: AuditUrlParams): string {
  const search = new URLSearchParams();
  if (params.clientId) search.set("clientId", params.clientId);
  const domain = params.domain?.trim();
  if (domain) search.set("domain", domain);
  const brandName = params.brandName?.trim();
  if (brandName) search.set("brandName", brandName);
  const qs = search.toString();
  return qs ? `/audit?${qs}` : "/audit";
}

export type AuditSearchPrefill = {
  clientId: string | null;
  domain: string | null;
  brandName: string | null;
};

export function parseAuditSearchParams(
  searchParams: URLSearchParams | null | undefined
): AuditSearchPrefill {
  if (!searchParams) {
    return { clientId: null, domain: null, brandName: null };
  }
  return {
    clientId: searchParams.get("clientId")?.trim() || null,
    domain:
      searchParams.get("domain")?.trim() ||
      searchParams.get("url")?.trim() ||
      null,
    brandName:
      searchParams.get("brandName")?.trim() ||
      searchParams.get("brand")?.trim() ||
      null,
  };
}
