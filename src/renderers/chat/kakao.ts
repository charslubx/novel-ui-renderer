import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/kakao.css?inline";

interface Message { id: string; sender: string; name?: string; side: "left"|"right"; text: string; time?: string; read?: number|null; }
interface KakaoProps { title: string; date?: string; messages: Message[]; }
const isMessage = (x: unknown): x is Message => !!x && typeof x === "object" && typeof (x as Message).id === "string" && typeof (x as Message).sender === "string" && ["left","right"].includes((x as Message).side) && typeof (x as Message).text === "string";

export const KakaoRenderer: NovelUIRenderer<KakaoProps> = {
  component: "chat", variant: "kakao", styles: common + styles,
  validate(value): value is KakaoProps { const p = value as KakaoProps; return !!p && typeof p.title === "string" && Array.isArray(p.messages) && p.messages.every(isMessage); },
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
      if (message.read !== null && message.read !== undefined) meta.append(element("span", "message__read", String(message.read)));
      if (message.time) meta.append(element("time", "message__time", message.time));
      line.append(meta); row.append(line); messages.append(row);
    }
    root.append(messages); return root;
  },
};
