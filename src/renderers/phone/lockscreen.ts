import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/lockscreen.css?inline";

interface LockNotification {
  id: string;
  app: string;
  title: string;
  text: string;
  time?: string;
}

interface LockscreenProps {
  time: string;
  date: string;
  owner?: string;
  battery?: number;
  notifications: LockNotification[];
}

const isNotification = (value: unknown): value is LockNotification => {
  const item = value as LockNotification;
  return !!item
    && [item.id, item.app, item.title, item.text].every((field) => typeof field === "string")
    && (item.time === undefined || typeof item.time === "string");
};

export const LockscreenRenderer: NovelUIRenderer<LockscreenProps> = {
  component: "phone",
  variant: "lockscreen",
  styles: common + styles,
  validate(value): value is LockscreenProps {
    const props = value as LockscreenProps;
    return !!props
      && typeof props.time === "string"
      && typeof props.date === "string"
      && (props.owner === undefined || typeof props.owner === "string")
      && (props.battery === undefined || (typeof props.battery === "number" && props.battery >= 0 && props.battery <= 100))
      && Array.isArray(props.notifications)
      && props.notifications.every(isNotification);
  },
  render(props) {
    const root = element("section", "novel-ui lockscreen");
    const status = element("div", "lockscreen__status");
    status.append(
      element("span", "", props.owner ?? ""),
      element("span", "", `●●●  Wi-Fi  ${props.battery ?? 100}%`),
    );
    root.append(status, element("div", "lockscreen__lock", "⌁"));
    const clock = element("header", "lockscreen__clock");
    clock.append(element("div", "lockscreen__date", props.date), element("div", "lockscreen__time", props.time));
    root.append(clock);

    const notifications = element("div", "lockscreen__notifications");
    for (const item of props.notifications) {
      const card = element("article", "lockscreen__notification");
      const header = element("div", "lockscreen__notification-header");
      header.append(
        element("span", "lockscreen__app-icon", item.app.slice(0, 1).toUpperCase()),
        element("span", "lockscreen__app", item.app),
        element("time", "lockscreen__notification-time", item.time ?? "现在"),
      );
      card.append(header, element("div", "lockscreen__notification-title", item.title), element("div", "lockscreen__notification-text", item.text));
      notifications.append(card);
    }
    root.append(notifications, element("div", "lockscreen__homebar"));
    return root;
  },
};
