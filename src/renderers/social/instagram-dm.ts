import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { renderDefaultAvatar } from "../shared/person-avatar";
import common from "../../styles/common.css?inline";
import styles from "../../styles/instagram-dm.css?inline";

interface DirectMessage {
  id: string;
  sender: string;
  side: "left" | "right";
  text: string;
  time?: string;
  status?: string;
}

interface InstagramDmProps {
  title: string;
  handle?: string;
  active?: string;
  messages: DirectMessage[];
}

const isMessage = (value: unknown): value is DirectMessage => {
  const message = value as DirectMessage;
  return !!message
    && [message.id, message.sender, message.text].every((field) => typeof field === "string")
    && ["left", "right"].includes(message.side)
    && (message.time === undefined || typeof message.time === "string")
    && (message.status === undefined || typeof message.status === "string");
};

export const InstagramDmRenderer: NovelUIRenderer<InstagramDmProps> = {
  component: "social",
  variant: "instagram-dm",
  styles: common + styles,
  validate(value): value is InstagramDmProps {
    const props = value as InstagramDmProps;
    return !!props
      && typeof props.title === "string"
      && (props.handle === undefined || typeof props.handle === "string")
      && (props.active === undefined || typeof props.active === "string")
      && Array.isArray(props.messages)
      && props.messages.every(isMessage);
  },
  render(props) {
    const root = element("section", "novel-ui instagram-dm");
    const header = element("header", "instagram-dm__header");
    header.append(element("span", "instagram-dm__back", "‹"), renderDefaultAvatar("instagram-dm__avatar"));
    const identity = element("div", "instagram-dm__identity");
    identity.append(element("strong", "", props.title));
    if (props.handle || props.active) identity.append(element("span", "", [props.handle, props.active].filter(Boolean).join(" · ")));
    header.append(identity, element("span", "instagram-dm__actions", "⌕  ⓘ"));
    root.append(header);

    const thread = element("div", "instagram-dm__thread");
    for (const message of props.messages) {
      const row = element("div", `instagram-dm__row instagram-dm__row--${message.side}`);
      if (message.time) row.append(element("time", "instagram-dm__time", message.time));
      row.append(element("div", "instagram-dm__bubble", message.text));
      if (message.status && message.side === "right") row.append(element("span", "instagram-dm__status", message.status));
      thread.append(row);
    }
    const composer = element("footer", "instagram-dm__composer");
    composer.append(element("span", "instagram-dm__camera", "◉"), element("span", "instagram-dm__input", "发消息……"), element("span", "", "♡"));
    root.append(thread, composer);
    return root;
  },
};
