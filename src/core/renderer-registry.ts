import type { NovelUIBlock } from "../parser/schema";
import { logger } from "./logger";

export interface RenderContext { raw: string; debug: boolean; }
export interface NovelUIRenderer<T = Record<string, unknown>> {
  component: string; variant: string;
  validate(props: unknown): props is T;
  render(props: T, context: RenderContext): HTMLElement;
  styles: string;
}

export class RendererRegistry {
  private renderers = new Map<string, NovelUIRenderer<unknown>>();
  register<T>(renderer: NovelUIRenderer<T>) { this.renderers.set(`${renderer.component}:${renderer.variant}`, renderer as NovelUIRenderer<unknown>); }
  render(block: NovelUIBlock, context: RenderContext): HTMLElement | null {
    const key = `${block.component}:${block.variant}`;
    const renderer = this.renderers.get(key);
    if (!renderer) { logger.warn(`Renderer not found: ${key}`); return null; }
    if (!renderer.validate(block.props)) { logger.warn(`Invalid renderer props: ${key}`); return null; }
    try {
      const host = document.createElement("div");
      host.className = "novel-ui-host";
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style"); style.textContent = renderer.styles;
      shadow.append(style, renderer.render(block.props, context));
      return host;
    } catch (error) { logger.error(`Renderer failed: ${key}`, error); return null; }
  }
}
