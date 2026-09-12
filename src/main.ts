import { ChatGPTAdapter } from "./adapters/chatgpt";
import { GeminiAdapter } from "./adapters/gemini";
import type { SiteAdapter } from "./adapters/site-adapter";
import { NovelUIRuntime } from "./core/observer";
import { RendererRegistry } from "./core/renderer-registry";
import { KakaoRenderer } from "./renderers/chat/kakao";
import { MedicalRenderer } from "./renderers/document/medical";

function resolveAdapter(): SiteAdapter | undefined { return [new ChatGPTAdapter(), new GeminiAdapter()].find((adapter) => adapter.match()); }
function bootstrap() {
  const adapter=resolveAdapter(); if(!adapter) return;
  const registry=new RendererRegistry(); registry.register(KakaoRenderer); registry.register(MedicalRenderer);
  new NovelUIRuntime(adapter, registry, localStorage.getItem("novel-ui-debug") === "true").start();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true }); else bootstrap();
