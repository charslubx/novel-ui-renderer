import { ChatGPTAdapter } from "./adapters/chatgpt";
import { GeminiAdapter } from "./adapters/gemini";
import type { SiteAdapter } from "./adapters/site-adapter";
import { NovelUIRuntime } from "./core/observer";
import { RendererRegistry } from "./core/renderer-registry";
import { KakaoRenderer } from "./renderers/chat/kakao";
import { IMessageRenderer } from "./renderers/chat/imessage";
import { LockscreenRenderer } from "./renderers/phone/lockscreen";
import { MedicalRenderer } from "./renderers/document/medical";
import { TheqooRenderer } from "./renderers/article/theqoo";
import { FiveChRenderer } from "./renderers/article/fivech";
import { WeiboRenderer } from "./renderers/social/weibo-post";
import { InstagramRenderer } from "./renderers/social/instagram-post";
import { InstagramDmRenderer } from "./renderers/social/instagram-dm";
import { OnlyFansRenderer } from "./renderers/social/onlyfans-post";
import { PornhubRenderer, YouTubeRenderer } from "./renderers/video/video-page";
import { XPostRenderer } from "./renderers/social/x-post";
import { XFeedRenderer } from "./renderers/social/x-feed";
import { XNotificationsRenderer } from "./renderers/social/x-notifications";
import { XTrendsRenderer } from "./renderers/social/x-trends";
import { BusTicketRenderer, FerryTicketRenderer, FlightTicketRenderer, RailTicketRenderer } from "./renderers/ticket/transport";
import { IdentityCardRenderer } from "./renderers/document/identity-card";
import { WorkCardRenderer } from "./renderers/document/work-card";
import { JapanPoliceRenderer, KoreaPoliceRenderer } from "./renderers/document/police";
import { NewsRenderer } from "./renderers/article/news";

declare global { interface Window { __novelUIRuntimeStarted?: boolean; } }

function resolveAdapter(): SiteAdapter | undefined { return [new ChatGPTAdapter(), new GeminiAdapter()].find((adapter) => adapter.match()); }
function bootstrap() {
  if (window.__novelUIRuntimeStarted) return;
  window.__novelUIRuntimeStarted = true;
  const adapter=resolveAdapter(); if(!adapter) return;
  const registry=new RendererRegistry();
  registry.register(KakaoRenderer);
  registry.register(IMessageRenderer);
  registry.register(LockscreenRenderer);
  registry.register(MedicalRenderer);
  registry.register(XPostRenderer);
  registry.register(XFeedRenderer);
  registry.register(XNotificationsRenderer);
  registry.register(XTrendsRenderer);
  registry.register(FlightTicketRenderer);
  registry.register(FerryTicketRenderer);
  registry.register(RailTicketRenderer);
  registry.register(BusTicketRenderer);
  registry.register(IdentityCardRenderer);
  registry.register(WorkCardRenderer);
  registry.register(TheqooRenderer);
  registry.register(FiveChRenderer);
  registry.register(WeiboRenderer);
  registry.register(InstagramRenderer);
  registry.register(InstagramDmRenderer);
  registry.register(OnlyFansRenderer);
  registry.register(PornhubRenderer);
  registry.register(YouTubeRenderer);
  registry.register(KoreaPoliceRenderer);
  registry.register(JapanPoliceRenderer);
  registry.register(NewsRenderer);
  new NovelUIRuntime(adapter, registry, localStorage.getItem("novel-ui-debug") === "true").start();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true }); else bootstrap();
