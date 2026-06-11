export {
  CRITICAL_API_PREFIXES,
  PUBLIC_API_PREFIXES,
  isApiPath,
  isCriticalApiPath,
  isPublicApiPath,
} from "@/lib/api-protection/config";
export { withApiProtection } from "@/lib/api-protection/with-api-protection";
export { withApiAuth } from "@/lib/api-protection/with-api-auth";
export { attachCanaryToJsonResponse } from "@/lib/api-protection/canary-response";
export {
  authorizeApiRequest,
  hasApiAuthSignal,
  validateApiAuthAtEdge,
} from "@/lib/api-protection/auth";
export { checkIpRateLimit, getClientIp } from "@/lib/api-protection/rate-limit";
export {
  buildSignaturePayload,
  computeSignature,
  verifyEnterpriseSignature,
} from "@/lib/api-protection/signing";
