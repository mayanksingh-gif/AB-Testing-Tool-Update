// Resolves Figma node IDs to human-readable screen names for the A/B results
// UI. Tracking always continues to use the raw node ID as its reliable
// internal identifier (see lib/figma.ts's normalizeFigmaNodeId) — this file
// only ever produces a *display label* layered on top, and never feeds back
// into event storage, participant flows, or completion detection.
//
// Server-only: reads FIGMA_ACCESS_TOKEN directly (not NEXT_PUBLIC_*), so it
// must never be imported from a "use client" component.
import {
  getFigmaNodeCache,
  upsertFigmaNodeName,
  assignFigmaFallbackName,
  type FigmaNodeCacheRow,
} from "./queries";
import { normalizeFigmaNodeId } from "./figma";

const FIGMA_API_BASE = "https://api.figma.com/v1";

// Figma auto-generates names like "Frame 123" / "Group 9" for layers a
// designer never renamed. Treat those as low-quality metadata and prefer a
// "Screen N" fallback instead of surfacing a meaningless label.
function isLowQualityNodeName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  return /^(frame|group|component|instance|rectangle|ellipse|vector|layer)\s*#?\d*$/i.test(trimmed);
}

function cacheRowLabel(row: FigmaNodeCacheRow): string | null {
  if (row.node_name && !isLowQualityNodeName(row.node_name)) return row.node_name;
  if (row.fallback_name) return row.fallback_name;
  return null;
}

interface FigmaNodesApiResponse {
  nodes?: Record<string, { document?: { name?: string } } | null>;
}

// The one reusable resolver — conceptually resolveFigmaNodeName(fileKey, nodeId),
// batched across every node ID a results page needs at once so it can make a
// single Figma API request instead of one per node.
export async function resolveFigmaNodeNames(
  fileKey: string | null,
  nodeIds: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const normalizedIds = [...new Set(nodeIds.map((id) => normalizeFigmaNodeId(id)).filter((id): id is string => !!id))];
  if (!fileKey || normalizedIds.length === 0) {
    // No file key resolvable (e.g. malformed Figma URL) — every node falls
    // back to a numbered screen label, keyed under a synthetic "no-key"
    // bucket so numbering is still stable across renders for this test.
    for (const nodeId of normalizedIds) {
      labels.set(nodeId, assignFigmaFallbackName("unknown", nodeId));
    }
    return labels;
  }

  const cached = getFigmaNodeCache(fileKey, normalizedIds);
  const cachedById = new Map(cached.map((row) => [row.node_id, row]));

  const unresolved: string[] = [];
  for (const nodeId of normalizedIds) {
    const row = cachedById.get(nodeId);
    const label = row ? cacheRowLabel(row) : null;
    if (label) labels.set(nodeId, label);
    else unresolved.push(nodeId);
  }
  if (unresolved.length === 0) return labels;

  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    // No credentials configured — assign permanent fallbacks so we never
    // retry a call that can't succeed, but analytics keep working.
    for (const nodeId of unresolved) {
      labels.set(nodeId, assignFigmaFallbackName(fileKey, nodeId));
    }
    return labels;
  }

  let fetched: FigmaNodesApiResponse | null = null;
  try {
    const idsParam = unresolved.join(",");
    const res = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(idsParam)}`, {
      headers: { "X-Figma-Token": token },
    });
    if (res.ok) fetched = (await res.json()) as FigmaNodesApiResponse;
  } catch {
    fetched = null;
  }

  let transientOrdinal = 0;
  for (const nodeId of unresolved) {
    // Figma's nodes endpoint keys its response by the hyphenated node-id
    // form, regardless of which separator was requested.
    const apiKey = nodeId.replace(":", "-");
    const name = fetched?.nodes?.[apiKey]?.document?.name ?? fetched?.nodes?.[nodeId]?.document?.name;

    if (fetched && name && !isLowQualityNodeName(name)) {
      upsertFigmaNodeName(fileKey, nodeId, name);
      labels.set(nodeId, name);
    } else if (fetched) {
      // Request succeeded but this node has no usable name (missing from
      // response, or a low-quality auto-generated name) — safe to persist a
      // fallback permanently.
      labels.set(nodeId, assignFigmaFallbackName(fileKey, nodeId));
    } else {
      // The API call itself failed (network/auth/permissions) — don't
      // persist anything, so a later successful call can still recover the
      // real name next time. Still never surface the raw node ID as the
      // primary label; use a render-local ordinal instead.
      transientOrdinal += 1;
      labels.set(nodeId, `Screen ${transientOrdinal}`);
    }
  }

  return labels;
}
