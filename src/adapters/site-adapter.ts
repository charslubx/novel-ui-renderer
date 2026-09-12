export interface SiteAdapter {
  readonly name: string;
  match(): boolean;
  getAssistantMessages(root?: ParentNode): HTMLElement[];
  observe(onMessagesChanged: (messages: HTMLElement[]) => void): () => void;
}
