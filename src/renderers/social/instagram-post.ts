import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { renderDefaultAvatar } from "../shared/person-avatar";
import common from "../../styles/common.css?inline";
import styles from "../../styles/instagram.css?inline";

interface InstagramProps {
  username: string;
  displayName?: string;
  avatar?: string;
  verified?: boolean;
  location?: string;
  image?: string;
  imageAlt?: string;
  text: string;
  timestamp: string;
  likes?: number;
  comments?: number;
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
export const InstagramRenderer: NovelUIRenderer<InstagramProps> = {
  component: "social",
  variant: "instagram-post",
  styles: common + styles,
  validate(value): value is InstagramProps {
    const p = value as InstagramProps;
    return (
      !!p &&
      [p.username, p.text, p.timestamp].every((x) => typeof x === "string") &&
      [p.likes, p.comments].every(optionalNumber)
    );
  },
  render(props) {
    const root = element("article", "novel-ui instagram"),
      header = element("header", "instagram__header"),
      avatar = renderDefaultAvatar("instagram__avatar",`${props.username}的默认头像`);
    const author = element("div", "instagram__author");
    author.append(
      element(
        "div",
        "instagram__username",
        props.username + (props.verified ? "  ✓" : ""),
      ),
    );
    if (props.location)
      author.append(element("div", "instagram__location", props.location));
    header.append(avatar, author, element("span", "instagram__more", "•••"));
    const media = element("div", "instagram__media"),
      imageUrl = safeUrl(props.image);
    if (imageUrl) {
      const img = element("img");
      img.src = imageUrl;
      img.alt = props.imageAlt ?? "帖子图片";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      media.append(img);
    } else
      media.append(
        element("span", "instagram__placeholder", props.imageAlt ?? "图片"),
      );
    const actions = element(
      "div",
      "instagram__actions",
      "♡　⌁　➤　　　　　　　　　▢",
    );
    const caption = element("div", "instagram__caption");
    caption.append(
      element("strong", "", props.username + " "),
      document.createTextNode(props.text),
    );
    root.append(
      header,
      media,
      actions,
      element("div", "instagram__likes", `${props.likes ?? 0} 次赞`),
      caption,
      element(
        "div",
        "instagram__comments",
        `查看全部 ${props.comments ?? 0} 条评论`,
      ),
      element("time", "instagram__time", props.timestamp),
    );
    return root;
  },
};
