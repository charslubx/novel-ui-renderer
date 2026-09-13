import { logger } from "../core/logger";
import { isNovelUIBlock, type NovelUIBlock, type ParsedNovelUIBlock } from "./schema";

interface MarkerPair { open: string; close: string; }

const MARKERS: MarkerPair[] = [
  { open: "[[novel-ui]]", close: "[[/novel-ui]]" },
  { open: ":::novel-ui", close: ":::" },
];

function findNextMarker(text: string, cursor: number): { marker: MarkerPair; start: number } | undefined {
  return MARKERS
    .map((marker) => ({ marker, start: text.indexOf(marker.open, cursor) }))
    .filter(({ start }) => start >= 0)
    .sort((left, right) => left.start - right.start)[0];
}

export function parseNovelUIBlocksDetailed(text: string): ParsedNovelUIBlock[] {
  const result: ParsedNovelUIBlock[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const match = findNextMarker(text, cursor);
    if (!match) break;
    const { marker, start } = match;
    const jsonStart = start + marker.open.length;
    const close = text.indexOf(marker.close, jsonStart);
    if (close < 0) break; // streaming block: wait for the terminator
    const end = close + marker.close.length;
    const raw = text.slice(start, end);
    const json = text.slice(jsonStart, close).trim();
    try {
      const candidate: unknown = JSON.parse(json);
      if (isNovelUIBlock(candidate)) result.push({ block: candidate, raw, start, end });
      else logger.warn("Invalid Novel UI schema", candidate);
    } catch (error) {
      const missingVariant=/"component"\s*:\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"props"\s*:/.test(json);
      logger.error(missingVariant?'Invalid Novel UI JSON: possible missing "variant" key before renderer name':"Invalid Novel UI JSON",error);
    }
    cursor = end;
  }
  return result;
}

export function parseNovelUIBlocks(text: string): NovelUIBlock[] {
  return parseNovelUIBlocksDetailed(text).map(({ block }) => block);
}
