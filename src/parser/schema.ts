export interface NovelUIBlock {
  schema: "novel-ui";
  version: string;
  component: string;
  variant: string;
  props: Record<string, unknown>;
}

export interface ParsedNovelUIBlock {
  block: NovelUIBlock;
  raw: string;
  start: number;
  end: number;
}

export function isNovelUIBlock(value: unknown): value is NovelUIBlock {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.schema === "novel-ui" && typeof item.version === "string" && item.version.length > 0 &&
    typeof item.component === "string" && item.component.length > 0 &&
    typeof item.variant === "string" && item.variant.length > 0 &&
    !!item.props && typeof item.props === "object" && !Array.isArray(item.props);
}
