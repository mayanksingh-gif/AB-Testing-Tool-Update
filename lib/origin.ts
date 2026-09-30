import type { headers as nextHeaders } from "next/headers";

// Builds the base URL for participant-facing links from the incoming
// request itself, instead of a hardcoded env var. This way a link copied
// while the researcher is on "http://localhost:3000" stays a localhost
// link, and one copied while browsing via the machine's LAN IP (e.g.
// "http://192.168.1.23:3000", useful for testing on a phone on the same
// Wi-Fi) automatically uses that address instead — no manual config, and
// it keeps working if the LAN IP changes later.
//
// NEXT_PUBLIC_APP_URL, if explicitly set, still wins — that's for a real
// deployment (e.g. Vercel) where the public URL is fixed and known.
export function getOrigin(requestHeaders: ReturnType<typeof nextHeaders>): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes("localhost")) return configured;

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return configured || "http://localhost:3000";

  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
