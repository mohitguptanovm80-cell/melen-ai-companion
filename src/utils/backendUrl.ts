export function resolveBackendUrl(
  configuredUrl: string | undefined,
  hostUri: string | undefined,
  scriptUrl: string | undefined,
  development: boolean,
): string | null {
  if (configuredUrl?.trim()) return configuredUrl.trim();
  if (!development) return null;
  // Prefer the bundle URL: it preserves HTTPS tunnels and USB-forwarded localhost.
  for (const candidate of [scriptUrl, hostUri && (/^https?:\/\//.test(hostUri) ? hostUri : `http://${hostUri}`)]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === 'http:' || url.protocol === 'https:') return `${url.origin}/api/ai`;
    } catch { /* Try the next available development address. */ }
  }
  return null;
}
