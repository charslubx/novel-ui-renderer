import type { SiteAdapter } from "./site-adapter";
import { debounce } from "../utils/debounce";

export class ChatGPTAdapter implements SiteAdapter {
  readonly name = "ChatGPT";
  match() { return location.hostname === "chatgpt.com"; }
  getAssistantMessages(root: ParentNode = document) {
    const selector = '[data-message-author-role="assistant"]';
    return Array.from(root.querySelectorAll<HTMLElement>(selector))
      .filter((message) => !message.querySelector(selector));
  }
  observe(onMessagesChanged: (messages: HTMLElement[]) => void) {
    const pending = new Set<HTMLElement>();
    const flush = debounce(() => {
      const messages = [...pending]; pending.clear();
      if (messages.length) onMessagesChanged(messages);
    }, 200);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const el = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        const message = el?.closest<HTMLElement>('[data-message-author-role="assistant"]');
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
