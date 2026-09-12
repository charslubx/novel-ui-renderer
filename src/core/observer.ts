import type { SiteAdapter } from "../adapters/site-adapter";
import { parseNovelUIBlocksDetailed } from "../parser/novel-ui-parser";
import type { ParsedNovelUIBlock } from "../parser/schema";
import type { RendererRegistry } from "./renderer-registry";
import { logger } from "./logger";

const processedNodes = new WeakSet<HTMLElement>();

export class NovelUIRuntime {
  private stopObserving?: () => void;
  constructor(private adapter: SiteAdapter, private registry: RendererRegistry, private debug = false) {}
  start() {
    logger.setDebug(this.debug); logger.info(`Starting on ${this.adapter.name}`);
    this.process(this.adapter.getAssistantMessages());
    this.stopObserving = this.adapter.observe((messages) => this.process(messages));
  }
  stop() { this.stopObserving?.(); }
  private process(messages: HTMLElement[]) { messages.forEach((message) => this.processMessage(message)); }
  private processMessage(message: HTMLElement) {
    if (processedNodes.has(message) || message.dataset.novelUiRendered === "true") return;
    const text = message.textContent ?? "";
    const parsed = parseNovelUIBlocksDetailed(text);
    if (!parsed.length) return;
    const completed: { item: ParsedNovelUIBlock; wrapper: HTMLElement }[] = [];
    for (const item of parsed) {
      const rendered = this.registry.render(item.block, { raw: item.raw, debug: this.debug });
      if (!rendered) continue;
      const wrapper = document.createElement("div"); wrapper.dataset.novelUiBlock = `${item.start}:${item.end}`; wrapper.append(rendered);
      if (this.debug) {
        const details=document.createElement("details"), summary=document.createElement("summary"), pre=document.createElement("pre");
        summary.textContent="View source"; pre.textContent=item.raw; details.append(summary,pre); wrapper.append(details);
      }
      completed.push({ item, wrapper });
    }
    if (completed.length) {
      // Preserve the DOM source for recovery while hiding the model-visible schema text.
      this.hideRawRanges(message, completed.map(({ item }) => item));
      completed.forEach(({ wrapper }) => message.append(wrapper));
      message.dataset.novelUiRendered = "true"; processedNodes.add(message);
    }
  }
  private hideRawRanges(message: HTMLElement, blocks: ParsedNovelUIBlock[]) {
    const walker=document.createTreeWalker(message,NodeFilter.SHOW_TEXT);
    const nodes: Text[]=[]; while(walker.nextNode()) nodes.push(walker.currentNode as Text);
    const positions: { node: Text; start: number; end: number }[]=[];
    let cursor=0; for (const node of nodes) { positions.push({node,start:cursor,end:cursor+node.data.length}); cursor+=node.data.length; }
    for (const block of [...blocks].sort((a,b)=>b.start-a.start)) {
      const first=positions.find((p)=>block.start>=p.start && block.start<=p.end);
      const last=[...positions].reverse().find((p)=>block.end>=p.start && block.end<=p.end);
      if (!first || !last) { logger.warn("Unable to hide raw schema range"); continue; }
      const range=document.createRange(); range.setStart(first.node,block.start-first.start); range.setEnd(last.node,block.end-last.start);
      const holder=document.createElement("span"); holder.hidden=true; holder.dataset.novelUiRaw="true";
      holder.append(range.extractContents()); range.insertNode(holder);
    }
  }
}
