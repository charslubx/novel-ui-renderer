// ==UserScript==
// @name         Novel UI Renderer
// @namespace    novel-ui
// @version      0.3.1
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
  const styles$6 = ".kakao { max-width: 430px; border-radius: 18px; background: #b9ced9; box-shadow: 0 10px 30px #0f172a20; }\n.kakao__header { padding: 14px 18px; background: #ffffffde; font-weight: 700; text-align: center; }\n.kakao__date { width: max-content; margin: 12px auto; padding: 4px 10px; border-radius: 999px; color: #fff; background: #607d8b99; font-size: 11px; }\n.kakao__messages { display: grid; gap: 10px; padding: 4px 14px 18px; }\n.message { display: flex; flex-direction: column; max-width: 78%; }\n.message--right { justify-self: end; align-items: end; }\n.message--left { justify-self: start; align-items: start; }\n.message__name { margin: 0 4px 3px; font-size: 11px; color: #475569; }\n.message__line { display: flex; align-items: end; gap: 5px; }\n.message--right .message__line { flex-direction: row-reverse; }\n.message__bubble { padding: 9px 12px; border-radius: 13px; background: #fff; white-space: pre-wrap; overflow-wrap: anywhere; }\n.message--right .message__bubble { background: #fee500; }\n.message__meta { display: grid; justify-items: end; color: #475569; font-size: 10px; white-space: nowrap; }\n.message__read { color: #8a6d00; }\n";
  const isMessage = (x) => !!x && typeof x === "object" && typeof x.id === "string" && typeof x.sender === "string" && ["left", "right"].includes(x.side) && typeof x.text === "string";
  const KakaoRenderer = {
    component: "chat",
    variant: "kakao",
    styles: common + styles$6,
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
  const styles$5 = ".medical { max-width: 680px; padding: 28px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; box-shadow: 0 8px 24px #0f172a14; }\n.medical__hospital { color: #0f4c81; font-size: 20px; font-weight: 800; }\n.medical__department { padding-bottom: 12px; border-bottom: 2px solid #0f4c81; color: #64748b; }\n.medical__title { margin: 22px 0; text-align: center; font-size: 19px; }\n.medical__fields { display: grid; grid-template-columns: minmax(0,.9fr) minmax(0,.9fr) minmax(240px,1.35fr); gap: 14px 24px; margin-bottom: 20px; }\n.medical__field { display: flex; min-width: 0; align-items: baseline; gap: 8px; }\n.medical__field--wide { grid-column: 1 / -1; }\n.medical__label { color: #64748b; }\n.medical__value { min-width: 0; overflow-wrap: anywhere; }\n.medical__findings-title { margin: 16px 0 6px; font-weight: 700; }\n.medical__findings { white-space: pre-wrap; overflow-wrap: anywhere; }\n@media (max-width: 640px) {\n  .medical { padding: 22px; }\n  .medical__fields { grid-template-columns: repeat(2,minmax(0,1fr)); }\n  .medical__field--examination,.medical__field--wide { grid-column: 1 / -1; }\n}\n@media (max-width: 430px) {\n  .medical__fields { grid-template-columns: 1fr; }\n  .medical__field { display: grid; gap: 2px; }\n}\n";
  const wideLabels = /* @__PURE__ */ new Set(["clinical history", "history", "clinical indication", "indication", "reason for examination"]);
  const MedicalRenderer = {
    component: "document",
    variant: "medical",
    styles: common + styles$5,
    validate(value) {
      const p = value;
      return !!p && [p.hospital, p.department, p.patient, p.reportTitle, p.findings].every((x) => typeof x === "string") && Array.isArray(p.fields) && p.fields.every((f) => f && typeof f.label === "string" && typeof f.value === "string" && (f.wide === void 0 || typeof f.wide === "boolean"));
    },
    render(props) {
      const root = element("article", "novel-ui medical");
      root.append(element("div", "medical__hospital", props.hospital), element("div", "medical__department", props.department), element("h2", "medical__title", props.reportTitle));
      const fields = element("div", "medical__fields");
      [{ label: "Patient", value: props.patient }, ...props.fields].forEach(({ label, value, wide }) => {
        const normalized = label.trim().toLowerCase();
        const isWide = wide === true || wideLabels.has(normalized) || value.length > 42;
        const classes = ["medical__field", isWide ? "medical__field--wide" : "", normalized === "examination" ? "medical__field--examination" : ""].filter(Boolean).join(" ");
        const field = element("div", classes);
        field.append(element("span", "medical__label", `${label}:`), element("span", "medical__value", value));
        fields.append(field);
      });
      root.append(fields, element("div", "medical__findings-title", "Findings"), element("div", "medical__findings", props.findings));
      return root;
    }
  };
  const styles$4 = ".theqoo { max-width: 720px; border: 1px solid #dedede; background: #fff; color: #333; }\n.theqoo__bar { padding: 9px 14px; background: #375486; color: #fff; font-weight: 700; }\n.theqoo__header { padding: 16px; border-bottom: 1px solid #e5e5e5; }\n.theqoo__category { color: #e34b61; font-size: 12px; font-weight: 700; }\n.theqoo__title { margin: 5px 0 8px; font-size: 19px; }\n.theqoo__meta { color: #888; font-size: 11px; }\n.theqoo__content { padding: 22px 16px; white-space: pre-wrap; overflow-wrap: anywhere; }\n.theqoo__comments { border-top: 8px solid #f3f3f3; }\n.theqoo__comment { padding: 11px 16px; border-top: 1px solid #eee; }\n.theqoo__comment-meta { margin-bottom: 4px; color: #667; font-size: 11px; }\n.theqoo__likes { float: right; color: #e34b61; }\n";
  const isComment = (value) => {
    const c = value;
    return !!c && typeof c.id === "string" && typeof c.author === "string" && typeof c.text === "string" && (c.likes === void 0 || typeof c.likes === "number");
  };
  const TheqooRenderer = {
    component: "article",
    variant: "theqoo",
    styles: common + styles$4,
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
  const styles$3 = ".weibo { max-width: 620px; padding: 16px; border: 1px solid #e6e6e6; border-radius: 10px; background: #fff; color: #222; box-shadow: 0 4px 16px #0000000d; }\n.weibo__author { display: flex; align-items: baseline; gap: 7px; }\n.weibo__name { font-weight: 700; }\n.weibo__verified { color: #ff8200; }\n.weibo__handle,.weibo__meta { color: #939393; font-size: 11px; }\n.weibo__text { margin: 12px 0 16px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; line-height: 1.65; }\n.weibo__stats { display: grid; grid-template-columns: repeat(3,1fr); padding-top: 11px; border-top: 1px solid #f2f2f2; color: #666; text-align: center; font-size: 12px; }\n";
  const optionalNumber$1 = (value) => value === void 0 || typeof value === "number" && value >= 0;
  const WeiboRenderer = {
    component: "social",
    variant: "weibo-post",
    styles: common + styles$3,
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
  const styles$2 = ':host{--x-bg:#000;--x-text:#e7e9ea;--x-muted:#71767b;--x-line:#2f3336;--x-blue:#1d9bf0}.x-shell{width:min(100%,680px);overflow:hidden;border:1px solid var(--x-line);border-radius:18px;background:var(--x-bg);color:var(--x-text);font-family:Arial,"Microsoft YaHei","PingFang SC",sans-serif}.x-shell--single{border-radius:14px}.x-app-header{position:relative;display:flex;min-height:58px;align-items:center;justify-content:center;padding:8px 52px;border-bottom:1px solid var(--x-line);font-size:19px;font-weight:800}.x-app-header__avatar{position:absolute;left:16px;width:34px;height:34px;border-radius:50%;background:#30353a}.x-app-header__action{position:absolute;right:16px;color:var(--x-text);font-size:24px}.x-tabs{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;min-height:48px;border-bottom:1px solid var(--x-line);color:var(--x-muted)}.x-tab{display:flex;position:relative;align-items:center;justify-content:center;padding:12px 8px;font-weight:700;white-space:nowrap}.x-tab--active{color:var(--x-text)}.x-tab--active::after{content:"";position:absolute;right:20%;bottom:0;left:20%;height:3px;border-radius:3px;background:var(--x-blue)}.x-post{display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px;padding:14px 16px 7px;border-bottom:1px solid var(--x-line)}.x-avatar{width:48px;height:48px;overflow:hidden;border-radius:50%;background:#272b2f}.x-avatar__image{width:100%;height:100%;object-fit:cover}.x-avatar__fallback{display:grid;width:100%;height:100%;place-items:center;color:#fff;font-size:20px;font-weight:800}.x-post__body{min-width:0}.x-post__author{display:flex;min-width:0;align-items:center;gap:4px;font-size:15px;line-height:20px}.x-post__name{overflow:hidden;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.x-post__verified{display:grid;width:15px;height:15px;flex:0 0 15px;place-items:center;border-radius:50%;background:var(--x-blue);color:#fff;font-size:10px}.x-post__handle,.x-post__time{overflow:hidden;color:var(--x-muted);text-overflow:ellipsis;white-space:nowrap}.x-post__more{margin-left:auto;color:var(--x-muted);font-size:20px}.x-post__translation{margin:5px 0 2px;color:var(--x-muted);font-size:13px}.x-post__text{margin:4px 0 10px;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--x-text);font-size:16px;line-height:1.45}.x-media{display:grid;max-height:520px;overflow:hidden;margin:8px 0;border:1px solid var(--x-line);border-radius:16px;gap:2px;background:var(--x-line)}.x-media--2,.x-media--3,.x-media--4{grid-template-columns:repeat(2,1fr)}.x-media__image-frame{display:grid;min-height:180px;place-items:center;overflow:hidden;background:#16181c}.x-media--1 .x-media__image-frame{min-height:280px}.x-media__image{width:100%;height:100%;min-height:inherit;object-fit:cover}.x-media__placeholder{padding:30px;color:var(--x-muted);text-align:center}.x-media__link{grid-column:1/-1;overflow:hidden;background:#000}.x-media__link-image{width:100%;max-height:290px;object-fit:cover}.x-media__link-copy{padding:10px 12px;border-top:1px solid var(--x-line)}.x-media__domain,.x-media__description{color:var(--x-muted);font-size:13px}.x-media__title{margin:2px 0;color:var(--x-text)}.x-post__stats{display:grid;grid-template-columns:repeat(6,1fr);align-items:center;margin:4px 0 1px;color:var(--x-muted);font-size:12px}.x-post__stat{min-width:0;white-space:nowrap}.x-feed-empty{padding:46px 20px;color:var(--x-muted);text-align:center}.x-search{display:flex;align-items:center;gap:10px;padding:10px 16px}.x-search__avatar{width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:#30353a}.x-search__box{flex:1;padding:11px 18px;border-radius:999px;background:#202327;color:var(--x-muted);font-size:16px}.x-search__gear{color:var(--x-text);font-size:23px}.x-trend{position:relative;padding:13px 20px}.x-trend__category,.x-trend__posts{color:var(--x-muted);font-size:13px}.x-trend__title{margin:3px 0;color:var(--x-text);font-size:16px;font-weight:800}.x-trend__more{position:absolute;top:9px;right:18px;color:var(--x-muted);font-size:20px}.x-notification{display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px;padding:14px 16px;border-bottom:1px solid var(--x-line)}.x-notification__type{color:#7856ff;font-size:29px;text-align:center}.x-notification__top{display:flex;align-items:center;gap:7px}.x-notification__avatar{width:38px;height:38px;overflow:hidden;border-radius:50%;background:#272b2f}.x-notification__avatar img{width:100%;height:100%;object-fit:cover}.x-notification__name{margin-top:7px;font-weight:800}.x-notification__meta{color:var(--x-muted);font-weight:400}.x-notification__translation{margin:7px 0;color:var(--x-muted);font-size:13px}.x-notification__text{color:var(--x-muted);font-size:16px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:520px){.x-shell{border-radius:12px}.x-post{grid-template-columns:40px minmax(0,1fr);padding-inline:12px}.x-avatar{width:40px;height:40px}.x-post__stats{font-size:11px}.x-post__handle{max-width:90px}.x-tabs{overflow-x:auto}.x-tab{padding-inline:14px}}\n';
  const optionalNumber = (value) => value === void 0 || typeof value === "number" && value >= 0;
  const isText = (value) => value === void 0 || typeof value === "string";
  const isMedia = (value) => {
    const media = value;
    return !!media && (media.type === "image" || media.type === "link") && [media.url, media.alt, media.title, media.description, media.domain].every(isText);
  };
  function isXPostProps(value) {
    const post = value;
    return !!post && [post.displayName, post.handle, post.text, post.timestamp].every((item) => typeof item === "string") && [post.replies, post.reposts, post.likes, post.views].every(optionalNumber) && (post.media === void 0 || Array.isArray(post.media) && post.media.every(isMedia));
  }
  function safeImageUrl(value) {
    if (!value) return;
    try {
      const url = new URL(value, location.href);
      if (["http:", "https:"].includes(url.protocol)) return url.href;
    } catch {
      return;
    }
  }
  function avatar(props) {
    const box = element("div", "x-avatar"), url = safeImageUrl(props.avatar);
    if (url) {
      const image = element("img", "x-avatar__image");
      image.src = url;
      image.alt = `${props.displayName}的头像`;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      box.append(image);
    } else box.append(element("span", "x-avatar__fallback", props.displayName.trim().slice(0, 1).toUpperCase() || "?"));
    return box;
  }
  function renderMedia(items) {
    const grid = element("div", `x-media x-media--${Math.min(items.length, 4)}`);
    items.slice(0, 4).forEach((item) => {
      const url = safeImageUrl(item.url);
      if (item.type === "image") {
        const frame = element("div", "x-media__image-frame");
        if (url) {
          const image = element("img", "x-media__image");
          image.src = url;
          image.alt = item.alt ?? "帖子图片";
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          frame.append(image);
        } else frame.append(element("span", "x-media__placeholder", item.alt ?? "图片"));
        grid.append(frame);
      } else {
        const card = element("div", "x-media__link");
        if (url) {
          const image = element("img", "x-media__link-image");
          image.src = url;
          image.alt = item.alt ?? "链接预览";
          image.loading = "lazy";
          image.referrerPolicy = "no-referrer";
          card.append(image);
        }
        const copy = element("div", "x-media__link-copy");
        copy.append(element("div", "x-media__domain", item.domain ?? "链接"), element("div", "x-media__title", item.title ?? "链接内容"));
        if (item.description) copy.append(element("div", "x-media__description", item.description));
        card.append(copy);
        grid.append(card);
      }
    });
    return grid;
  }
  const compact = (value = 0) => value >= 1e4 ? `${(value / 1e3).toFixed(value >= 1e5 ? 0 : 1)}K` : String(value || "");
  function renderXPost(props) {
    var _a;
    const root = element("article", "x-post");
    root.append(avatar(props));
    const body = element("div", "x-post__body"), header = element("header", "x-post__author");
    header.append(element("span", "x-post__name", props.displayName));
    if (props.verified) header.append(element("span", "x-post__verified", "✓"));
    header.append(element("span", "x-post__handle", `@${props.handle.replace(/^@/, "")}`), element("span", "x-post__time", `· ${props.timestamp}`), element("span", "x-post__more", "⋮"));
    body.append(header);
    if (props.translatedFrom) body.append(element("div", "x-post__translation", `◉ 翻译自${props.translatedFrom}　${props.translationLabel ?? "显示原文"}`));
    body.append(element("div", "x-post__text", props.text));
    if ((_a = props.media) == null ? void 0 : _a.length) body.append(renderMedia(props.media));
    const stats = element("footer", "x-post__stats");
    [["◯", props.replies, "回复"], ["⇄", props.reposts, "转发"], ["♡", props.likes, "喜欢"], ["▥", props.views, "浏览"], ["⌑", void 0, "收藏"], ["⌯", void 0, "分享"]].forEach(([icon, value, label]) => {
      const stat = element("span", "x-post__stat", `${icon}${typeof value === "number" ? ` ${compact(value)}` : ""}`);
      stat.setAttribute("aria-label", String(label));
      stats.append(stat);
    });
    body.append(stats);
    root.append(body);
    return root;
  }
  const XPostRenderer = { component: "social", variant: "x-post", styles: common + styles$2, validate: isXPostProps, render(props) {
    const shell = element("section", "novel-ui x-shell x-shell--single");
    shell.append(renderXPost(props));
    return shell;
  } };
  const XFeedRenderer = { component: "social", variant: "x-feed", styles: common + styles$2, validate(value) {
    const p = value;
    return !!p && Array.isArray(p.posts) && p.posts.every(isXPostProps) && (p.title === void 0 || typeof p.title === "string");
  }, render(props) {
    const shell = element("section", "novel-ui x-shell"), header = element("header", "x-app-header", props.title ?? "首页");
    header.append(element("span", "x-app-header__avatar"), element("span", "x-app-header__action", "⚙"));
    const tabs = element("nav", "x-tabs");
    tabs.append(element("span", `x-tab ${props.activeTab !== "following" ? "x-tab--active" : ""}`, "为你推荐"), element("span", `x-tab ${props.activeTab === "following" ? "x-tab--active" : ""}`, "正在关注"));
    shell.append(header, tabs);
    if (props.posts.length) props.posts.forEach((post) => shell.append(renderXPost(post)));
    else shell.append(element("div", "x-feed-empty", "暂无帖子"));
    return shell;
  } };
  const isNotification = (value) => {
    const n = value;
    return !!n && typeof n.id === "string" && typeof n.displayName === "string" && typeof n.timestamp === "string" && typeof n.text === "string";
  };
  function safeUrl(value) {
    if (!value) return;
    try {
      const url = new URL(value, location.href);
      if (["http:", "https:"].includes(url.protocol)) return url.href;
    } catch {
      return;
    }
  }
  const XNotificationsRenderer = { component: "social", variant: "x-notifications", styles: common + styles$2, validate(value) {
    const p = value;
    return !!p && Array.isArray(p.notifications) && p.notifications.every(isNotification);
  }, render(props) {
    const shell = element("section", "novel-ui x-shell"), header = element("header", "x-app-header", "通知");
    header.append(element("span", "x-app-header__avatar"), element("span", "x-app-header__action", "⚙"));
    const tabs = element("nav", "x-tabs"), active = props.activeTab ?? "all";
    [["all", "全部"], ["mentions", "提及"], ["verified", "已认证"]].forEach(([key, label]) => tabs.append(element("span", `x-tab ${active === key ? "x-tab--active" : ""}`, label)));
    shell.append(header, tabs);
    props.notifications.forEach((notice) => {
      const row = element("article", "x-notification");
      row.append(element("div", "x-notification__type", notice.type === "mention" ? "@" : "✦"));
      const body = element("div", "x-notification__body"), top = element("div", "x-notification__top"), avatar2 = element("div", "x-notification__avatar"), url = safeUrl(notice.avatar);
      if (url) {
        const image = element("img");
        image.src = url;
        image.alt = "";
        image.loading = "lazy";
        avatar2.append(image);
      } else avatar2.append(element("span", "x-avatar__fallback", notice.displayName.slice(0, 1)));
      top.append(avatar2, element("span", "x-post__more", "⋮"));
      body.append(top);
      const name = element("div", "x-notification__name", `${notice.displayName} `);
      name.append(element("span", "x-notification__meta", `· ${notice.timestamp}`));
      body.append(name);
      if (notice.translatedFrom) body.append(element("div", "x-notification__translation", `◉ 翻译自${notice.translatedFrom}　显示原文`));
      body.append(element("div", "x-notification__text", notice.text));
      row.append(body);
      shell.append(row);
    });
    return shell;
  } };
  const isTrend = (value) => {
    const t = value;
    return !!t && typeof t.id === "string" && typeof t.category === "string" && typeof t.title === "string" && (t.posts === void 0 || typeof t.posts === "number" && t.posts >= 0);
  };
  const XTrendsRenderer = { component: "social", variant: "x-trends", styles: common + styles$2, validate(value) {
    const p = value;
    return !!p && Array.isArray(p.trends) && p.trends.every(isTrend);
  }, render(props) {
    const shell = element("section", "novel-ui x-shell"), search = element("header", "x-search");
    search.append(element("span", "x-search__avatar"), element("div", "x-search__box", `⌕　${props.searchPlaceholder ?? "搜索"}`), element("span", "x-search__gear", "⚙"));
    const tabs = element("nav", "x-tabs"), active = props.activeTab ?? "explore";
    [["explore", "探索"], ["trending", "当前趋势"], ["news", "新闻"], ["sports", "体育"], ["entertainment", "娱乐"]].forEach(([key, label]) => tabs.append(element("span", `x-tab ${active === key ? "x-tab--active" : ""}`, label)));
    shell.append(search, tabs);
    props.trends.forEach((trend) => {
      const item = element("div", "x-trend");
      item.append(element("div", "x-trend__category", trend.category), element("div", "x-trend__title", trend.title));
      if (trend.posts !== void 0) item.append(element("div", "x-trend__posts", `${trend.posts.toLocaleString()} 帖子`));
      item.append(element("span", "x-trend__more", "⋮"));
      shell.append(item);
    });
    return shell;
  } };
  const styles$1 = ':host{--ticket-accent:#2463a9;--ticket-accent-soft:#eaf2fb;--ticket-paper:#fff;--ticket-ink:#17202a;--ticket-muted:#69727d;--ticket-line:#d9dee5}.ticket{position:relative;width:min(100%,760px);overflow:hidden;border:1px solid var(--ticket-line);border-radius:18px;background:var(--ticket-paper);color:var(--ticket-ink);box-shadow:0 8px 24px #1f293714}.ticket--red{--ticket-accent:#b4232f;--ticket-accent-soft:#fff0f1}.ticket--green{--ticket-accent:#167a59;--ticket-accent-soft:#eaf8f2}.ticket--gold{--ticket-accent:#8a6418;--ticket-accent-soft:#fff8df}.ticket__header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:var(--ticket-accent);color:#fff}.ticket__operator{font-size:19px;font-weight:800}.ticket__operator-code{font-size:12px;letter-spacing:.14em}.ticket__kind{font-size:11px;opacity:.82}.ticket__route{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:24px 20px;background:var(--ticket-accent-soft)}.ticket__place:last-child{text-align:right}.ticket__code{font-size:32px;font-weight:800;letter-spacing:.04em}.ticket__name{color:var(--ticket-muted);font-size:12px}.ticket__route-line{display:flex;align-items:center;gap:6px;color:var(--ticket-accent);font-size:21px}.ticket__route-line::before,.ticket__route-line::after{content:"";width:34px;border-top:1px solid currentColor}.ticket__details{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;padding:20px}.ticket__field{min-width:0}.ticket__label{margin-bottom:4px;color:var(--ticket-muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em}.ticket__value{overflow-wrap:anywhere;font-size:14px;font-weight:700}.ticket__footer{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end;padding:16px 20px;border-top:1px dashed var(--ticket-line)}.ticket__number{color:var(--ticket-muted);font:12px ui-monospace,monospace}.ticket__barcode{display:flex;height:38px;align-items:stretch;gap:2px}.ticket__bar{display:block;background:var(--ticket-ink)}.ticket__notice{position:absolute;right:10px;bottom:3px;color:#9aa1a9;font-size:8px;letter-spacing:.12em}.person-avatar{position:relative;width:56px;height:64px;overflow:hidden;border-radius:8px;background:#e5e8ec}.person-avatar__head{position:absolute;top:9px;left:50%;width:22px;height:22px;transform:translateX(-50%);border-radius:50%;background:#9aa3ad}.person-avatar__body{position:absolute;bottom:-11px;left:50%;width:48px;height:43px;transform:translateX(-50%);border-radius:50% 50% 12px 12px;background:#9aa3ad}@media(max-width:560px){.ticket__details{grid-template-columns:repeat(2,minmax(0,1fr))}.ticket__route{gap:8px}.ticket__code{font-size:25px}.ticket__route-line::before,.ticket__route-line::after{width:16px}}\n';
  const isPlace = (value) => {
    const p = value;
    return !!p && typeof p.name === "string" && (p.code === void 0 || typeof p.code === "string");
  };
  function isTransportTicket(value) {
    const p = value;
    return !!p && [p.operator, p.ticketNumber, p.passenger, p.date, p.departure, p.serviceNumber].every((x) => typeof x === "string") && isPlace(p.origin) && isPlace(p.destination) && [p.operatorCode, p.arrival, p.seat, p.travelClass, p.boardingTime, p.gate, p.platform, p.pier, p.terminal, p.duration].every((x) => x === void 0 || typeof x === "string") && (p.theme === void 0 || ["blue", "red", "green", "gold"].includes(p.theme));
  }
  function barcode(seed) {
    const root = element("div", "ticket__barcode");
    let hash = 0;
    for (const char of seed) hash = hash * 31 + char.charCodeAt(0) >>> 0;
    for (let index = 0; index < 34; index++) {
      hash = Math.imul(hash, 1664525) + 1013904223 >>> 0;
      const bar = element("span", "ticket__bar");
      bar.style.width = `${1 + hash % 4}px`;
      root.append(bar);
    }
    return root;
  }
  function createTransportRenderer(variant, labels) {
    return { component: "ticket", variant, styles: common + styles$1, validate: isTransportTicket, render(props) {
      const root = element("article", `novel-ui ticket ticket--${props.theme ?? "blue"}`);
      const header = element("header", "ticket__header"), brand = element("div");
      brand.append(element("div", "ticket__operator", props.operator), element("div", "ticket__operator-code", props.operatorCode ?? ""));
      header.append(brand, element("div", "ticket__kind", labels.kind));
      const route = element("section", "ticket__route");
      for (const [place, side] of [[props.origin, "origin"], [props.destination, "destination"]]) {
        const box = element("div", `ticket__place ticket__place--${side}`);
        box.append(element("div", "ticket__code", place.code ?? place.name.slice(0, 3).toUpperCase()), element("div", "ticket__name", place.name));
        if (side === "origin") route.append(box, element("div", "ticket__route-line", labels.routeIcon));
        else route.append(box);
      }
      const details = element("section", "ticket__details");
      const fields = [["PASSENGER", props.passenger], ["DATE", props.date], ["DEPARTURE", props.departure], ["ARRIVAL", props.arrival], [labels.service, props.serviceNumber], ["CLASS", props.travelClass], ["SEAT", props.seat], ["BOARDING", props.boardingTime], [labels.location, labels.locationValue(props)], ["TERMINAL", props.terminal], ["DURATION", props.duration]];
      fields.filter(([, value]) => value).forEach(([label, value]) => {
        const field = element("div", "ticket__field");
        field.append(element("div", "ticket__label", label), element("div", "ticket__value", value));
        details.append(field);
      });
      const footer = element("footer", "ticket__footer");
      footer.append(element("div", "ticket__number", `TICKET ${props.ticketNumber}`), barcode(props.ticketNumber));
      root.append(header, route, details, footer, element("span", "ticket__notice", "FICTIONAL TRAVEL DOCUMENT"));
      return root;
    } };
  }
  const FlightTicketRenderer = createTransportRenderer("flight", { kind: "BOARDING PASS", service: "FLIGHT", location: "GATE", locationValue: (p) => p.gate, routeIcon: "✈" });
  const FerryTicketRenderer = createTransportRenderer("ferry", { kind: "FERRY PASS", service: "VESSEL / VOYAGE", location: "PIER", locationValue: (p) => p.pier, routeIcon: "≈" });
  const RailTicketRenderer = createTransportRenderer("rail", { kind: "RAIL TICKET", service: "TRAIN", location: "PLATFORM", locationValue: (p) => p.platform, routeIcon: "→" });
  const BusTicketRenderer = createTransportRenderer("bus", { kind: "COACH TICKET", service: "SERVICE", location: "PLATFORM", locationValue: (p) => p.platform, routeIcon: "→" });
  function renderDefaultPersonAvatar(className = "person-avatar") {
    const avatar2 = element("div", className);
    avatar2.setAttribute("role", "img");
    avatar2.setAttribute("aria-label", "默认人物头像");
    avatar2.append(element("span", `${className}__head`), element("span", `${className}__body`));
    return avatar2;
  }
  const styles = ':host{--id-blue:#244f78;--id-red:#9d303b;--id-paper:#f5f0e6;--id-ink:#19232d;--id-muted:#68737d}.identity-card,.work-card{position:relative;width:min(100%,660px);overflow:hidden;border:1px solid #c9c4b9;border-radius:16px;background:linear-gradient(135deg,#faf7ef,#e8edf0);color:var(--id-ink);box-shadow:0 8px 24px #1f29371a}.identity-card::after{content:"FICTIONAL · NOVEL UI";position:absolute;top:48%;left:18%;transform:rotate(-16deg);color:#8b949e1f;font-size:38px;font-weight:800;letter-spacing:.08em;pointer-events:none}.identity-card__header,.work-card__header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--id-blue);color:#fff}.identity-card__country,.work-card__organization{font-size:18px;font-weight:800}.identity-card__kind,.work-card__kind{font-size:11px;letter-spacing:.1em;opacity:.8}.identity-card__body{display:grid;grid-template-columns:82px 1fr;gap:20px;padding:22px}.identity-card .person-avatar{width:82px;height:106px}.identity-card__fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 20px}.identity-card__field--wide{grid-column:1/-1}.identity-card__label,.work-card__label{color:var(--id-muted);font-size:9px;letter-spacing:.08em}.identity-card__value,.work-card__value{margin-top:2px;font-weight:700;overflow-wrap:anywhere}.identity-card__footer{display:flex;justify-content:space-between;padding:12px 18px;border-top:1px solid #cfd4d7;color:var(--id-muted);font-size:10px}.work-card{width:min(100%,390px);text-align:center}.work-card__header{display:block}.work-card__body{display:grid;justify-items:center;padding:24px}.work-card .person-avatar{width:90px;height:105px;border-radius:50% 50% 12px 12px}.work-card__name{margin-top:14px;font-size:22px;font-weight:800}.work-card__title{color:var(--id-blue);font-size:14px;font-weight:700}.work-card__details{display:grid;width:100%;grid-template-columns:repeat(2,1fr);gap:13px;margin-top:22px;padding-top:18px;border-top:1px solid #ccd2d7;text-align:left}.work-card__footer{padding:12px;background:#e2e7ea;color:var(--id-muted);font:11px ui-monospace,monospace}@media(max-width:480px){.identity-card__body{grid-template-columns:64px 1fr;gap:13px;padding:16px}.identity-card .person-avatar{width:64px;height:86px}.identity-card__fields{grid-template-columns:1fr}.identity-card__field--wide{grid-column:auto}.identity-card::after{font-size:26px}}\n';
  const IdentityCardRenderer = { component: "document", variant: "identity-card", styles: common + styles, validate(value) {
    const p = value;
    return !!p && [p.country, p.fullName, p.idNumber, p.birthDate, p.validUntil].every((x) => typeof x === "string");
  }, render(props) {
    const root = element("article", "novel-ui identity-card"), header = element("header", "identity-card__header");
    header.append(element("div", "identity-card__country", props.country), element("div", "identity-card__kind", props.documentName ?? "IDENTITY CARD"));
    const body = element("section", "identity-card__body"), fields = element("div", "identity-card__fields");
    [["NAME", props.fullName, true], ["ID NUMBER", props.idNumber, true], ["DATE OF BIRTH", props.birthDate], ["SEX", props.sex], ["NATIONALITY", props.nationality], ["VALID FROM", props.validFrom]].filter(([, value]) => value).forEach(([label, value, wide]) => {
      const field = element("div", `identity-card__field${wide ? " identity-card__field--wide" : ""}`);
      field.append(element("div", "identity-card__label", String(label)), element("div", "identity-card__value", String(value)));
      fields.append(field);
    });
    body.append(renderDefaultPersonAvatar(), fields);
    const footer = element("footer", "identity-card__footer");
    footer.append(element("span", "", props.authority ?? "Fictional Authority"), element("span", "", `VALID UNTIL ${props.validUntil}`));
    root.append(header, body, footer);
    return root;
  } };
  const WorkCardRenderer = { component: "document", variant: "work-card", styles: common + styles, validate(value) {
    const p = value;
    return !!p && [p.organization, p.fullName, p.title, p.employeeId].every((x) => typeof x === "string");
  }, render(props) {
    const root = element("article", "novel-ui work-card"), header = element("header", "work-card__header");
    header.append(element("div", "work-card__organization", props.organization), element("div", "work-card__kind", "EMPLOYEE IDENTIFICATION"));
    const body = element("section", "work-card__body");
    body.append(renderDefaultPersonAvatar(), element("div", "work-card__name", props.fullName), element("div", "work-card__title", props.title));
    const details = element("div", "work-card__details");
    [["EMPLOYEE ID", props.employeeId], ["DEPARTMENT", props.department], ["ACCESS", props.accessLevel], ["VALID UNTIL", props.validUntil]].filter(([, value]) => value).forEach(([label, value]) => {
      const field = element("div", "work-card__field");
      field.append(element("div", "work-card__label", label), element("div", "work-card__value", value));
      details.append(field);
    });
    body.append(details);
    root.append(header, body, element("footer", "work-card__footer", `ID ${props.employeeId} · FICTIONAL PROP`));
    return root;
  } };
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
    registry.register(WeiboRenderer);
    new NovelUIRuntime(adapter, registry, localStorage.getItem("novel-ui-debug") === "true").start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  else bootstrap();
})();
