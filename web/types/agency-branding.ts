export type AgencyBrandingFeatures = {
  showRecommendations: boolean;
  allowClientFeedback: boolean;
  enableChat: boolean;
  brandedEmails: boolean;
};

export const DEFAULT_AGENCY_BRANDING_FEATURES: AgencyBrandingFeatures = {
  showRecommendations: true,
  allowClientFeedback: true,
  enableChat: false,
  brandedEmails: false,
};

export type AgencyBranding = {
  agencyId: string;
  agencyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  customDomain: string | null;
  portalName: string | null;
  reportHeader: string | null;
  reportFooter: string | null;
  features: AgencyBrandingFeatures;
};

export type AgencyBrandingInput = {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customDomain?: string | null;
  portalName?: string | null;
  reportHeader?: string | null;
  reportFooter?: string | null;
  features?: Partial<AgencyBrandingFeatures>;
};

export type ResolvedClientBranding = AgencyBranding & {
  /** Effective logo after client override */
  logoUrl: string | null;
  /** Effective primary color after client override */
  primaryColor: string;
  /** Effective report footer after client override */
  reportFooter: string | null;
};

export const GOOGLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans 3",
  "Nunito",
  "Raleway",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Outfit",
  "Plus Jakarta Sans",
  "IBM Plex Sans",
] as const;

export type GoogleFont = (typeof GOOGLE_FONTS)[number];
