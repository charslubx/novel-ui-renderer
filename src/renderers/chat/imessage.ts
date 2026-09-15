import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { renderDefaultAvatar } from "../shared/person-avatar";
import common from "../../styles/common.css?inline";
import styles from "../../styles/imessage.css?inline";

interface IMessage {
  id: string;
  sender: string;
  side: "left" | "right";
  text: string;
  time?: string;
  status?: string;
}

interface IMessageProps {
  title: string;
  subtitle?: string;
  date?: string;
  messages: IMessage[];
}

const isMessage = (value: unknown): value is IMessage => {
  const message = value as IMessage;
  return !!message
    && typeof message.id === "string"
    && typeof message.sender === "string"
    && ["left", "right"].includes(message.side)
    && typeof message.text === "string"
    && (message.time === undefined || typeof message.time === "string")
    && (message.status === undefined || typeof message.status === "string");
};

export const IMessageRenderer: NovelUIRenderer<IMessageProps> = {
  component: "chat",
  variant: "imessage",
  styles: common + styles,
  validate(value): value is IMessageProps {
    const props = value as IMessageProps;
    return !!props
      && typeof props.title === "string"
      && Array.isArray(props.messages)
      && props.messages.every(isMessage)
      && (props.subtitle === undefined || typeof props.subtitle === "string")
      && (props.date === undefined || typeof props.date === "string");
  },
  render(props) {
    const root = element("section", "novel-ui imessage");
    const header = element("header", "imessage__header");
    header.append(element("span", "imessage__back", "‹"));

    const contact = element("div", "imessage__contact");
    contact.append(renderDefaultAvatar("imessage__avatar"), element("div", "imessage__title", props.title));
    if (props.subtitle) contact.append(element("div", "imessage__subtitle", props.subtitle));
    header.append(contact, element("span", "imessage__chevron", "›"));
    root.append(header);

    if (props.date) root.append(element("div", "imessage__date", props.date));
    const thread = element("div", "imessage__thread");
    for (const message of props.messages) {
      const row = element("div", `imessage__row imessage__row--${message.side}`);
      if (message.time) row.append(element("time", "imessage__time", message.time));
      row.append(element("div", "imessage__bubble", message.text));
      if (message.status && message.side === "right") row.append(element("div", "imessage__status", message.status));
      thread.append(row);
    }

    const composer = element("footer", "imessage__composer");
    composer.append(
      element("span", "imessage__plus", "＋"),
      element("span", "imessage__input", "短信"),
      element("span", "imessage__mic", "◉"),
    );
    root.append(thread, composer);
    return root;
  },
};
