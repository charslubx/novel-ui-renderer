import type { SiteAdapter } from "./site-adapter";
import { debounce } from "../utils/debounce";

export class GeminiAdapter implements SiteAdapter {
  readonly name = "Gemini";
  match() { return location.hostname === "gemini.google.com"; }
  getAssistantMessages(root: ParentNode = document) {
    const selectors = ["model-response", ".model-response-text", '[data-test-id="model-response"]'];
    return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(",")));
  }
  observe(onMessagesChanged: (messages: HTMLElement[]) => void) {
    const scan = debounce(() => onMessagesChanged(this.getAssistantMessages()), 250);
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }
}
