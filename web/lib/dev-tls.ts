/** Allow Google token exchange on networks with SSL inspection (dev only). */
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
