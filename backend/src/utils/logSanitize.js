/**
 * Redacts high-entropy path segments (tokens) from URLs for safe logging.
 */
export function sanitizeRequestPath(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return pathOrUrl;
  return pathOrUrl
    .replace(/(\/api\/auth\/verify\/)([^/?#]+)/gi, "$1[redacted]")
    .replace(/(\/api\/auth\/confirm-delete\/)([^/?#]+)/gi, "$1[redacted]");
}
