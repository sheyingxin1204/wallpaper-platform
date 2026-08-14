export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}
