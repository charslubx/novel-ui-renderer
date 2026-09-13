import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { renderDefaultAvatar } from "../shared/person-avatar";
import common from "../../styles/common.css?inline";
import styles from "../../styles/x-post.css?inline";
interface Notification {
  id: string;
  type?: "post" | "mention" | "verified";
  displayName: string;
  handle?: string;
  avatar?: string;
  timestamp: string;
  text: string;
  translatedFrom?: string;
}
interface XNotificationsProps {
  activeTab?: "all" | "mentions" | "verified";
  notifications: Notification[];
}
const isNotification = (value: unknown): value is Notification => {
  const n = value as Notification;
  return (
    !!n &&
    typeof n.id === "string" &&
    typeof n.displayName === "string" &&
    typeof n.timestamp === "string" &&
    typeof n.text === "string"
  );
};
function safeUrl(value?: string) {
  if (!value) return;
  try {
    const url = new URL(value, location.href);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch {
    return;
  }
}
export const XNotificationsRenderer: NovelUIRenderer<XNotificationsProps> = {
  component: "social",
  variant: "x-notifications",
  styles: common + styles,
  validate(value): value is XNotificationsProps {
    const p = value as XNotificationsProps;
    return (
      !!p &&
      Array.isArray(p.notifications) &&
      p.notifications.every(isNotification)
    );
  },
  render(props) {
    const shell = element("section", "novel-ui x-shell"),
      header = element("header", "x-app-header", "通知");
    header.append(
      renderDefaultAvatar("x-app-header__avatar"),
      element("span", "x-app-header__action", "⚙"),
    );
    const tabs = element("nav", "x-tabs"),
      active = props.activeTab ?? "all";
    [
      ["all", "全部"],
      ["mentions", "提及"],
      ["verified", "已认证"],
    ].forEach(([key, label]) =>
      tabs.append(
        element(
          "span",
          `x-tab ${active === key ? "x-tab--active" : ""}`,
          label,
        ),
      ),
    );
    shell.append(header, tabs);
    props.notifications.forEach((notice) => {
      const row = element("article", "x-notification");
      row.append(
        element(
          "div",
          "x-notification__type",
          notice.type === "mention" ? "@" : "✦",
        ),
      );
      const body = element("div", "x-notification__body"),
        top = element("div", "x-notification__top"),
        avatar = renderDefaultAvatar("x-notification__avatar",`${notice.displayName}的默认头像`);
      top.append(avatar, element("span", "x-post__more", "⋮"));
      body.append(top);
      const name = element(
        "div",
        "x-notification__name",
        `${notice.displayName} `,
      );
      name.append(
        element("span", "x-notification__meta", `· ${notice.timestamp}`),
      );
      body.append(name);
      if (notice.translatedFrom)
        body.append(
          element(
            "div",
            "x-notification__translation",
            `◉ 翻译自${notice.translatedFrom}　显示原文`,
          ),
        );
      body.append(element("div", "x-notification__text", notice.text));
      row.append(body);
      shell.append(row);
    });
    return shell;
  },
};
