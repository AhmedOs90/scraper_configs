// services/refiners/normalizeHost.js

export function canonicalHostFromUrl(rootUrl = "") {
  try {
    const host = new URL(rootUrl).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return rootUrl; // if not a valid URL, fall back (keeps legacy behavior)
  }
}
