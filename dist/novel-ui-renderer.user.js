// ==UserScript==
// @name         Novel UI Renderer
// @namespace    novel-ui
// @version      0.1.0
// @description  Render structured Novel UI blocks inside AI chat websites
// @match        https://chatgpt.com/*
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function() {
  "use strict";
  function debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }
  class ChatGPTAdapter {
    constructor() {
      __publicField(this, "name", "ChatGPT");
    }
    match() {
      return location.hostname === "chatgpt.com";
    }
    getAssistantMessages(root = document) {
      const selector = '[data-message-author-role="assistant"]';
      return Array.from(root.querySelectorAll(selector)).filter((message) => !message.querySelector(selector));
    }
    observe(onMessagesChanged) {
      const pending = /* @__PURE__ */ new Set();
      const flush = debounce(() => {
        const messages = [...pending];
        pending.clear();
        if (messages.length) onMessagesChanged(messages);
      }, 200);
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const el = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
          const message = el == null ? void 0 : el.closest('[data-message-author-role="assistant"]');
          if (message) pending.add(message);
          for (const node of mutation.addedNodes) if (node instanceof HTMLElement) {
            if (node.matches('[data-message-author-role="assistant"]')) pending.add(node);
            this.getAssistantMessages(node).forEach((item) => pending.add(item));
          }
        }
        flush();
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      return () => observer.disconnect();
    }
  }
  class GeminiAdapter {
    constructor() {
      __publicField(this, "name", "Gemini");
    }
    match() {
      return location.hostname === "gemini.google.com";
    }
    getAssistantMessages(root = document) {
      const selectors = ["model-response", ".model-response-text", '[data-test-id="model-response"]'];
      return Array.from(root.querySelectorAll(selectors.join(",")));
    }
    observe(onMessagesChanged) {
      const scan = debounce(() => onMessagesChanged(this.getAssistantMessages()), 250);
      const observer = new MutationObserver(scan);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      return () => observer.disconnect();
    }
  }
  class Logger {
    constructor(debugEnabled = false) {
      this.debugEnabled = debugEnabled;
    }
    setDebug(enabled) {
      this.debugEnabled = enabled;
    }
    debug(...args) {
      if (this.debugEnabled) console.debug("[NovelUI]", ...args);
    }
    info(...args) {
      console.info("[NovelUI]", ...args);
    }
    warn(...args) {
      console.warn("[NovelUI]", ...args);
    }
    error(...args) {
      console.error("[NovelUI]", ...args);
    }
  }
  const logger = new Logger(false);
  function isNovelUIBlock(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const item = value;
    return item.schema === "novel-ui" && typeof item.version === "string" && item.version.length > 0 && typeof item.component === "string" && item.component.length > 0 && typeof item.variant === "string" && item.variant.length > 0 && !!item.props && typeof item.props === "object" && !Array.isArray(item.props);
  }
  const OPEN = ":::novel-ui";
  const CLOSE = ":::";
  function parseNovelUIBlocksDetailed(text) {
    const result = [];
    let cursor = 0;
    while (cursor < text.length) {
      const start = text.indexOf(OPEN, cursor);
      if (start < 0) break;
      const jsonStart = start + OPEN.length;
      const close = text.indexOf(CLOSE, jsonStart);
      if (close < 0) break;
      const end = close + CLOSE.length;
      const raw = text.slice(start, end);
      const json = text.slice(jsonStart, close).trim();
      try {
        const candidate = JSON.parse(json);
        if (isNovelUIBlock(candidate)) result.push({ block: candidate, raw, start, end });
        else logger.warn("Invalid Novel UI schema", candidate);
      } catch (error) {
        logger.error("Invalid Novel UI JSON", error);
      }
      cursor = end;
    }
    return result;
  }
  const processedNodes = /* @__PURE__ */ new WeakSet();
  function blockKey(item) {
    let hash = 2166136261;
    for (let index = 0; index < item.raw.length; index++) {
      hash ^= item.raw.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${item.block.component}:${item.block.variant}:${(hash >>> 0).toString(36)}`;
  }
  class NovelUIRuntime {
    constructor(adapter, registry, debug = false) {
      __publicField(this, "stopObserving");
      this.adapter = adapter;
      this.registry = registry;
      this.debug = debug;
    }
    start() {
      logger.setDebug(this.debug);
      logger.info(`Starting on ${this.adapter.name}`);
      this.process(this.adapter.getAssistantMessages());
      this.stopObserving = this.adapter.observe((messages) => this.process(messages));
    }
    stop() {
      var _a;
      (_a = this.stopObserving) == null ? void 0 : _a.call(this);
    }
    process(messages) {
      messages.forEach((message) => this.processMessage(message));
    }
    processMessage(message) {
      if (processedNodes.has(message) || message.dataset.novelUiRendered === "true") return;
      if (message.closest('[data-novel-ui-runtime="true"]')) return;
      const text = message.textContent ?? "";
      const parsed = parseNovelUIBlocksDetailed(text);
      if (!parsed.length) return;
      const completed = [];
      for (const item of parsed) {
        const rendered = this.registry.render(item.block, { raw: item.raw, debug: this.debug });
        if (!rendered) continue;
        const key = blockKey(item);
        if (message.querySelector(`[data-novel-ui-key="${key}"]`)) continue;
        const wrapper = document.createElement("div");
        wrapper.dataset.novelUiRuntime = "true";
        wrapper.dataset.novelUiKey = key;
        wrapper.append(rendered);
        if (this.debug) {
          const details = document.createElement("details"), summary = document.createElement("summary"), pre = document.createElement("pre");
          summary.textContent = "View source";
          pre.textContent = item.raw;
          details.append(summary, pre);
          wrapper.append(details);
        }
        completed.push({ item, wrapper });
      }
      if (completed.length) {
        this.replaceRawRanges(message, completed);
        message.dataset.novelUiRendered = "true";
        processedNodes.add(message);
      }
    }
    replaceRawRanges(message, completed) {
      const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const positions = [];
      let cursor = 0;
      for (const node of nodes) {
        positions.push({ node, start: cursor, end: cursor + node.data.length });
        cursor += node.data.length;
      }
      for (const { item: block, wrapper } of [...completed].sort((a, b) => b.item.start - a.item.start)) {
        const first = positions.find((p) => block.start >= p.start && block.start <= p.end);
        const last = [...positions].reverse().find((p) => block.end >= p.start && block.end <= p.end);
        if (!first || !last) {
          logger.warn("Unable to hide raw schema range");
          continue;
        }
        const range = document.createRange();
        range.setStart(first.node, block.start - first.start);
        range.setEnd(last.node, block.end - last.start);
        const holder = document.createElement("span");
        holder.hidden = true;
        holder.dataset.novelUiRaw = "true";
        holder.append(range.extractContents());
        range.insertNode(holder);
        holder.after(wrapper);
      }
    }
  }
  class RendererRegistry {
    constructor() {
      __publicField(this, "renderers", /* @__PURE__ */ new Map());
    }
    register(renderer) {
      this.renderers.set(`${renderer.component}:${renderer.variant}`, renderer);
    }
    render(block, context) {
      const key = `${block.component}:${block.variant}`;
      const renderer = this.renderers.get(key);
      if (!renderer) {
        logger.warn(`Renderer not found: ${key}`);
        return null;
      }
      if (!renderer.validate(block.props)) {
        logger.warn(`Invalid renderer props: ${key}`);
        return null;
      }
      try {
        const host = document.createElement("div");
        host.className = "novel-ui-host";
        const shadow = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = renderer.styles;
        shadow.append(style, renderer.render(block.props, context));
        return host;
      } catch (error) {
        logger.error(`Renderer failed: ${key}`, error);
        return null;
      }
    }
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  const common = ':host { --novel-font-size: 14px; --novel-radius: 12px; --novel-spacing: 8px; color: #202124; font: var(--novel-font-size)/1.45 system-ui,-apple-system,"Segoe UI",sans-serif; }\n*,*::before,*::after { box-sizing: border-box; }\n.novel-ui { margin: 16px 0; overflow: hidden; }\n.fallback { padding: 12px; border: 1px dashed #d97706; border-radius: var(--novel-radius); color: #92400e; background: #fffbeb; }\n.source-toggle { margin: 8px 0 0; border: 0; background: transparent; color: #64748b; cursor: pointer; font: inherit; font-size: 12px; }\n.source { white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; background: #111827; color: #e5e7eb; border-radius: 8px; font: 12px/1.45 ui-monospace,monospace; }\n';
  const styles$4 = ".kakao { max-width: 430px; border-radius: 18px; background: #b9ced9; box-shadow: 0 10px 30px #0f172a20; }\n.kakao__header { padding: 14px 18px; background: #ffffffde; font-weight: 700; text-align: center; }\n.kakao__date { width: max-content; margin: 12px auto; padding: 4px 10px; border-radius: 999px; color: #fff; background: #607d8b99; font-size: 11px; }\n.kakao__messages { display: grid; gap: 10px; padding: 4px 14px 18px; }\n.message { display: flex; flex-direction: column; max-width: 78%; }\n.message--right { justify-self: end; align-items: end; }\n.message--left { justify-self: start; align-items: start; }\n.message__name { margin: 0 4px 3px; font-size: 11px; color: #475569; }\n.message__line { display: flex; align-items: end; gap: 5px; }\n.message--right .message__line { flex-direction: row-reverse; }\n.message__bubble { padding: 9px 12px; border-radius: 13px; background: #fff; white-space: pre-wrap; overflow-wrap: anywhere; }\n.message--right .message__bubble { background: #fee500; }\n.message__meta { display: grid; justify-items: end; color: #475569; font-size: 10px; white-space: nowrap; }\n.message__read { color: #8a6d00; }\n";
  const isMessage = (x) => !!x && typeof x === "object" && typeof x.id === "string" && typeof x.sender === "string" && ["left", "right"].includes(x.side) && typeof x.text === "string";
  const KakaoRenderer = {
    component: "chat",
    variant: "kakao",
    styles: common + styles$4,
    validate(value) {
      const p = value;
      return !!p && typeof p.title === "string" && Array.isArray(p.messages) && p.messages.every(isMessage);
    },
    render(props) {
      const root = element("section", "novel-ui kakao");
      root.append(element("header", "kakao__header", props.title));
      if (props.date) root.append(element("div", "kakao__date", props.date));
      const messages = element("div", "kakao__messages");
      for (const message of props.messages) {
        const row = element("div", `message message--${message.side}`);
        if (message.name && message.side === "left") row.append(element("div", "message__name", message.name));
        const line = element("div", "message__line");
        line.append(element("div", "message__bubble", message.text));
        const meta = element("div", "message__meta");
        if (message.read !== null && message.read !== void 0) meta.append(element("span", "message__read", String(message.read)));
        if (message.time) meta.append(element("time", "message__time", message.time));
        line.append(meta);
        row.append(line);
        messages.append(row);
      }
      root.append(messages);
      return root;
    }
  };
  const styles$3 = ".medical { max-width: 680px; padding: 28px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; box-shadow: 0 8px 24px #0f172a14; }\n.medical__hospital { color: #0f4c81; font-size: 20px; font-weight: 800; }\n.medical__department { padding-bottom: 12px; border-bottom: 2px solid #0f4c81; color: #64748b; }\n.medical__title { margin: 22px 0; text-align: center; font-size: 19px; }\n.medical__fields { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 8px 24px; margin-bottom: 20px; }\n.medical__field { display: grid; grid-template-columns: auto 1fr; gap: 8px; }\n.medical__label { color: #64748b; }\n.medical__findings-title { margin: 16px 0 6px; font-weight: 700; }\n.medical__findings { white-space: pre-wrap; overflow-wrap: anywhere; }\n";
  const MedicalRenderer = {
    component: "document",
    variant: "medical",
    styles: common + styles$3,
    validate(value) {
      const p = value;
      return !!p && [p.hospital, p.department, p.patient, p.reportTitle, p.findings].every((x) => typeof x === "string") && Array.isArray(p.fields) && p.fields.every((f) => f && typeof f.label === "string" && typeof f.value === "string");
    },
    render(props) {
      const root = element("article", "novel-ui medical");
      root.append(element("div", "medical__hospital", props.hospital), element("div", "medical__department", props.department), element("h2", "medical__title", props.reportTitle));
      const fields = element("div", "medical__fields");
      [{ label: "Patient", value: props.patient }, ...props.fields].forEach(({ label, value }) => {
        const field = element("div", "medical__field");
        field.append(element("span", "medical__label", `${label}:`), element("span", "medical__value", value));
        fields.append(field);
      });
      root.append(fields, element("div", "medical__findings-title", "Findings"), element("div", "medical__findings", props.findings));
      return root;
    }
  };
  const styles$2 = ".theqoo { max-width: 720px; border: 1px solid #dedede; background: #fff; color: #333; }\n.theqoo__bar { padding: 9px 14px; background: #375486; color: #fff; font-weight: 700; }\n.theqoo__header { padding: 16px; border-bottom: 1px solid #e5e5e5; }\n.theqoo__category { color: #e34b61; font-size: 12px; font-weight: 700; }\n.theqoo__title { margin: 5px 0 8px; font-size: 19px; }\n.theqoo__meta { color: #888; font-size: 11px; }\n.theqoo__content { padding: 22px 16px; white-space: pre-wrap; overflow-wrap: anywhere; }\n.theqoo__comments { border-top: 8px solid #f3f3f3; }\n.theqoo__comment { padding: 11px 16px; border-top: 1px solid #eee; }\n.theqoo__comment-meta { margin-bottom: 4px; color: #667; font-size: 11px; }\n.theqoo__likes { float: right; color: #e34b61; }\n";
  const isComment = (value) => {
    const c = value;
    return !!c && typeof c.id === "string" && typeof c.author === "string" && typeof c.text === "string" && (c.likes === void 0 || typeof c.likes === "number");
  };
  const TheqooRenderer = {
    component: "article",
    variant: "theqoo",
    styles: common + styles$2,
    validate(value) {
      const p = value;
      return !!p && typeof p.title === "string" && typeof p.date === "string" && typeof p.content === "string" && (p.comments === void 0 || Array.isArray(p.comments) && p.comments.every(isComment));
    },
    render(props) {
      var _a;
      const root = element("article", "novel-ui theqoo");
      root.append(element("div", "theqoo__bar", "theqoo · HOT 게시판"));
      const header = element("header", "theqoo__header");
      if (props.category) header.append(element("div", "theqoo__category", props.category));
      header.append(element("h2", "theqoo__title", props.title), element("div", "theqoo__meta", `${props.author ?? "무명의 더쿠"} · ${props.date} · 조회 ${props.views ?? 0}`));
      root.append(header, element("div", "theqoo__content", props.content));
      if ((_a = props.comments) == null ? void 0 : _a.length) {
        const comments = element("section", "theqoo__comments");
        props.comments.forEach((c, index) => {
          const item = element("div", "theqoo__comment"), meta = element("div", "theqoo__comment-meta", `${index + 1}. ${c.author}${c.time ? ` · ${c.time}` : ""}`);
          if (c.likes !== void 0) meta.append(element("span", "theqoo__likes", `♥ ${c.likes}`));
          item.append(meta, element("div", "theqoo__comment-text", c.text));
          comments.append(item);
        });
        root.append(comments);
      }
      return root;
    }
  };
  const styles$1 = ".weibo { max-width: 620px; padding: 16px; border: 1px solid #e6e6e6; border-radius: 10px; background: #fff; color: #222; box-shadow: 0 4px 16px #0000000d; }\n.weibo__author { display: flex; align-items: baseline; gap: 7px; }\n.weibo__name { font-weight: 700; }\n.weibo__verified { color: #ff8200; }\n.weibo__handle,.weibo__meta { color: #939393; font-size: 11px; }\n.weibo__text { margin: 12px 0 16px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; line-height: 1.65; }\n.weibo__stats { display: grid; grid-template-columns: repeat(3,1fr); padding-top: 11px; border-top: 1px solid #f2f2f2; color: #666; text-align: center; font-size: 12px; }\n";
  const optionalNumber$1 = (value) => value === void 0 || typeof value === "number" && value >= 0;
  const WeiboRenderer = {
    component: "social",
    variant: "weibo-post",
    styles: common + styles$1,
    validate(value) {
      const p = value;
      return !!p && [p.displayName, p.timestamp, p.text].every((x) => typeof x === "string") && [p.reposts, p.comments, p.likes].every(optionalNumber$1);
    },
    render(props) {
      const root = element("article", "novel-ui weibo"), author = element("div", "weibo__author");
      author.append(element("span", "weibo__name", props.displayName));
      if (props.verified) author.append(element("span", "weibo__verified", "V"));
      if (props.handle) author.append(element("span", "weibo__handle", props.handle));
      const meta = [props.timestamp, props.source ? `来自 ${props.source}` : ""].filter(Boolean).join(" · ");
      const stats = element("footer", "weibo__stats");
      [["转发", props.reposts], ["评论", props.comments], ["赞", props.likes]].forEach(([label, value]) => stats.append(element("span", "", `${label} ${value ?? 0}`)));
      root.append(author, element("div", "weibo__meta", meta), element("div", "weibo__text", props.text), stats);
      return root;
    }
  };
  const styles = ".x-post { max-width: 600px; padding: 16px; border: 1px solid #cfd9de; border-radius: 16px; background: #fff; color: #0f1419; }\n.x-post__author { display: flex; align-items: center; gap: 7px; }\n.x-post__name { font-weight: 700; }\n.x-post__verified { color: #1d9bf0; }\n.x-post__handle,.x-post__time { color: #536471; }\n.x-post__text { margin: 12px 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 16px; }\n.x-post__stats { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #eff3f4; color: #536471; font-size: 12px; }\n";
  const optionalNumber = (value) => value === void 0 || typeof value === "number" && value >= 0;
  const XPostRenderer = {
    component: "social",
    variant: "x-post",
    styles: common + styles,
    validate(value) {
      const p = value;
      return !!p && [p.displayName, p.handle, p.text, p.timestamp].every((x) => typeof x === "string") && [p.replies, p.reposts, p.likes, p.views].every(optionalNumber);
    },
    render(props) {
      const root = element("article", "novel-ui x-post"), author = element("div", "x-post__author");
      author.append(element("span", "x-post__name", props.displayName));
      if (props.verified) author.append(element("span", "x-post__verified", "●"));
      author.append(element("span", "x-post__handle", `@${props.handle.replace(/^@/, "")}`), element("span", "x-post__time", `· ${props.timestamp}`));
      const stats = element("footer", "x-post__stats");
      [["回复", props.replies], ["转发", props.reposts], ["喜欢", props.likes], ["浏览", props.views]].forEach(([label, value]) => stats.append(element("span", "", `${label} ${value ?? 0}`)));
      root.append(author, element("div", "x-post__text", props.text), stats);
      return root;
    }
  };
  function resolveAdapter() {
    return [new ChatGPTAdapter(), new GeminiAdapter()].find((adapter) => adapter.match());
  }
  function bootstrap() {
    if (window.__novelUIRuntimeStarted) return;
    window.__novelUIRuntimeStarted = true;
    const adapter = resolveAdapter();
    if (!adapter) return;
    const registry = new RendererRegistry();
    registry.register(KakaoRenderer);
    registry.register(MedicalRenderer);
    registry.register(XPostRenderer);
    registry.register(TheqooRenderer);
    registry.register(WeiboRenderer);
    new NovelUIRuntime(adapter, registry, localStorage.getItem("novel-ui-debug") === "true").start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  else bootstrap();
})();
