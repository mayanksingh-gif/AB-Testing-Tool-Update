// Converts a normal Figma prototype URL into an embeddable URL, per Figma's
// Embed Kit 2.0. Preserves existing query params and adds the required
// embed-host / client-id params.
export function toEmbedUrl(figmaUrl: string): string {
  try {
    const url = new URL(figmaUrl.trim());
    url.hostname = "embed.figma.com";
    url.searchParams.set("embed-host", "prototype-testing");
    const clientId = process.env.NEXT_PUBLIC_FIGMA_CLIENT_ID;
    if (clientId) url.searchParams.set("client-id", clientId);
    return url.toString();
  } catch {
    return figmaUrl;
  }
}

// Normalizes a bare Figma node ID string into one consistent internal format
// ("1:1841"). Figma URLs write node IDs with a hyphen ("1-1841"); the Embed
// Kit's postMessage events report them with a colon ("1:1841"). Any node ID
// comparison in this app — configured success node vs. presentedNodeId from
// the iframe — must go through this so both sides use the same format,
// regardless of which format they arrived in.
export function normalizeFigmaNodeId(nodeId: string | null | undefined): string | null {
  if (!nodeId) return null;
  const trimmed = nodeId.trim();
  if (!trimmed) return null;
  // Only the first separator is structural (node IDs never contain more than
  // one "1-1841"/"1:1841" pair); replace hyphen with colon without touching
  // anything else in the string.
  const separatorIndex = trimmed.search(/[-:]/);
  if (separatorIndex === -1) return trimmed;
  return `${trimmed.slice(0, separatorIndex)}:${trimmed.slice(separatorIndex + 1)}`;
}

// Extracts the node ID from a Figma prototype/frame link, e.g.
// https://www.figma.com/proto/abc/Name?node-id=1-1841&... -> "1:1841"
// Figma URLs use "1-1841" (hyphen); the Embed API reports node IDs as
// "1:1841" (colon), so we normalize the separator on extraction.
export function extractNodeId(figmaUrl: string): string | null {
  try {
    const url = new URL(figmaUrl.trim());
    const raw = url.searchParams.get("node-id");
    if (!raw) return null;
    return normalizeFigmaNodeId(raw);
  } catch {
    return null;
  }
}

// Parses the "success link" field used by both create and edit forms. The
// create form always sends a full Figma URL (handled by extractNodeId), but
// the edit form pre-fills that same field with the *already-extracted* node
// ID (e.g. "1:1841") so the researcher sees what's configured rather than a
// URL that no longer exists anywhere. Re-submitting that value unchanged
// must not be treated as an invalid link. If the input parses as a URL, it's
// handled exactly as before; otherwise, if it already looks like a bare node
// ID, it's normalized and accepted directly.
export function parseSuccessLink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = extractNodeId(trimmed);
  if (fromUrl) return fromUrl;
  // Bare node ID shape: digits, then a single "-" or ":", then digits.
  if (/^\d+[-:]\d+$/.test(trimmed)) return normalizeFigmaNodeId(trimmed);
  return null;
}

// Extracts the file key from a Figma proto/design URL, e.g.
// https://www.figma.com/proto/abc123/My-Prototype?node-id=1-2 -> "abc123"
// Used only to resolve node names via the Figma REST API — never for
// participant tracking or embedding.
export function extractFileKey(figmaUrl: string): string | null {
  try {
    const url = new URL(figmaUrl.trim());
    const match = url.pathname.match(/\/(?:proto|design|file)\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Validates that a string is a well-formed Figma URL (any figma.com host —
// proto/design/file links are all accepted, since the two mandatory usability
// step fields just need "this is a real Figma link", not a specific path
// shape). Used for inline validation before a value is ever handed to
// extractNodeId/parseSuccessLink.
export function isValidFigmaUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname === "figma.com" || parsed.hostname.endsWith(".figma.com");
  } catch {
    return false;
  }
}
