import { logger } from "../core/logger";
import { isNovelUIBlock, type NovelUIBlock, type ParsedNovelUIBlock } from "./schema";

const OPEN = ":::novel-ui";
const CLOSE = ":::";

export function parseNovelUIBlocksDetailed(text: string): ParsedNovelUIBlock[] {
  const result: ParsedNovelUIBlock[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf(OPEN, cursor);
    if (start < 0) break;
    const jsonStart = start + OPEN.length;
    const close = text.indexOf(CLOSE, jsonStart);
    if (close < 0) break; // streaming block: wait for the terminator
    const end = close + CLOSE.length;
    const raw = text.slice(start, end);
    const json = text.slice(jsonStart, close).trim();
    try {
      const candidate: unknown = JSON.parse(json);
      if (isNovelUIBlock(candidate)) result.push({ block: candidate, raw, start, end });
      else logger.warn("Invalid Novel UI schema", candidate);
    } catch (error) {
      logger.error("Invalid Novel UI JSON", error);
    }
    cursor = end;
  }
  return result;
}

export function parseNovelUIBlocks(text: string): NovelUIBlock[] {
  return parseNovelUIBlocksDetailed(text).map(({ block }) => block);
}
