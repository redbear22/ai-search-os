export {
  createCanaryToken,
  embedCanary,
  buildCanaryDigest,
  extractCanaryFromText,
} from "@/lib/data-obfuscation/canary";
export {
  registerIssuedCanary,
  scanRequestForCanaryLeak,
  reportCanaryLeak,
  wasCanaryIssued,
  resetCanaryTrackerForTesting,
} from "@/lib/data-obfuscation/canary-tracker";
export {
  HONEYPOT_PATHS,
  handleHoneypotRequest,
  honeypotPayload,
  isHoneypotPath,
  isIpBlocked,
  recordHoneypotHit,
  getHoneypotEvents,
  resetHoneypotForTesting,
} from "@/lib/data-obfuscation/honeypot";
export {
  jsonWithObfuscation,
  jsonWithObfuscationAndJitter,
  withResponseJitter,
} from "@/lib/data-obfuscation/response";
