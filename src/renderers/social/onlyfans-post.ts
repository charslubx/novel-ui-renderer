import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { isPlatformComment,renderPlatformComments,type PlatformComment } from "../shared/platform-comments";
import common from "../../styles/common.css?inline";
import styles from "../../styles/onlyfans.css?inline";

interface OnlyFansProps {
  creator: string;
  handle: string;
  verified?: boolean;
  avatar?: string;
  timestamp: string;
  text: string;
  media?: string;
  mediaAlt?: string;
  likes?: number;
  comments?: number | PlatformComment[];
  subscribed?: boolean;
  subscriptionPrice?: string;
}
const optionalNumber = (value: unknown) =>
  value === undefined || (typeof value === "number" && value >= 0);
function safeUrl(value?: string) {
  if (!value) return;
  try {
    const url = new URL(value, location.href);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch {
    return;
  }
}
export const OnlyFansRenderer: NovelUIRenderer<OnlyFansProps> = {
  component: "social",
  variant: "onlyfans-post",
  styles: common + styles,
  validate(value): value is OnlyFansProps {
    const p = value as OnlyFansProps;
    return (
      !!p &&
      [p.creator, p.handle, p.timestamp, p.text].every(
        (x) => typeof x === "string",
      ) &&
      optionalNumber(p.likes) &&
      (p.comments === undefined || optionalNumber(p.comments) || (Array.isArray(p.comments) && p.comments.every(isPlatformComment)))
    );
  },
  render(props) {
    const root = element("article", "novel-ui onlyfans"),
      header = element("header", "onlyfans__header"),
      avatar = element("div", "onlyfans__avatar"),
      avatarUrl = safeUrl(props.avatar);
    if (avatarUrl) {
      const img = element("img");
      img.src = avatarUrl;
      img.alt = "";
      img.loading = "lazy";
      avatar.append(img);
    } else
      avatar.append(
        element("span", "", props.creator.slice(0, 1).toUpperCase()),
      );
    const identity = element("div", "onlyfans__identity");
    identity.append(
      element(
        "div",
        "onlyfans__creator",
        props.creator + (props.verified ? "  ✓" : ""),
      ),
      element(
        "div",
        "onlyfans__handle",
        `${props.handle} · ${props.timestamp}`,
      ),
    );
    header.append(avatar, identity, element("span", "onlyfans__more", "•••"));
    root.append(header, element("div", "onlyfans__text", props.text));
    if (props.media || props.mediaAlt) {
      const media = element("div", "onlyfans__media"),
        url = safeUrl(props.media);
      if (url) {
        const img = element("img");
        img.src = url;
        img.alt = props.mediaAlt ?? "创作者帖子图片";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        media.append(img);
      } else media.append(element("span", "", props.mediaAlt ?? "媒体内容"));
      root.append(media);
    }
    const stats = element("footer", "onlyfans__footer");
    stats.append(
      element("span", "", `♡ ${props.likes ?? 0}　💬 ${Array.isArray(props.comments) ? props.comments.length : props.comments ?? 0}`),
      element(
        "span",
        "onlyfans__status",
        props.subscribed
          ? "已订阅"
          : props.subscriptionPrice
            ? `订阅 ${props.subscriptionPrice}`
            : "订阅",
      ),
    );
    root.append(stats);
    if(Array.isArray(props.comments)&&props.comments.length)root.append(renderPlatformComments(props.comments));
    return root;
  },
};
