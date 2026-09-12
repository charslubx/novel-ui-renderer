import { ChatGPTAdapter } from "./adapters/chatgpt";
import { GeminiAdapter } from "./adapters/gemini";
import type { SiteAdapter } from "./adapters/site-adapter";
import { NovelUIRuntime } from "./core/observer";
import { RendererRegistry } from "./core/renderer-registry";
import { KakaoRenderer } from "./renderers/chat/kakao";
import { MedicalRenderer } from "./renderers/document/medical";
import { TheqooRenderer } from "./renderers/article/theqoo";
import { WeiboRenderer } from "./renderers/social/weibo-post";
import { XPostRenderer } from "./renderers/social/x-post";

declare global { interface Window { __novelUIRuntimeStarted?: boolean; } }

function resolveAdapter(): SiteAdapter | undefined { return [new ChatGPTAdapter(), new GeminiAdapter()].find((adapter) => adapter.match()); }
function bootstrap() {
  if (window.__novelUIRuntimeStarted) return;
  window.__novelUIRuntimeStarted = true;
  const adapter=resolveAdapter(); if(!adapter) return;
  const registry=new RendererRegistry();
  registry.register(KakaoRenderer);
  registry.register(MedicalRenderer);
  registry.register(XPostRenderer);
  registry.register(TheqooRenderer);
  registry.register(WeiboRenderer);
  new NovelUIRuntime(adapter, registry, localStorage.getItem("novel-ui-debug") === "true").start();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true }); else bootstrap();
