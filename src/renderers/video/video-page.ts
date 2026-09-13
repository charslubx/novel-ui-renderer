import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { renderDefaultAvatar } from "../shared/person-avatar";
import {
  isPlatformComment,
  renderPlatformComments,
  type PlatformComment,
} from "../shared/platform-comments";
import common from "../../styles/common.css?inline";
import styles from "../../styles/video-page.css?inline";

interface VideoProps {
  title: string;
  channel: string;
  verified?: boolean;
  thumbnail?: string;
  thumbnailAlt?: string;
  duration: string;
  views: string;
  uploaded: string;
  description?: string;
  likes?: number;
  subscribers?: string;
  category?: string;
  comments?: PlatformComment[];
}
function safeUrl(value?: string) {
  if (!value) return;
  try {
    const url = new URL(value, location.href);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch {
    return;
  }
}
function createVideoRenderer(
  variant: "youtube" | "pornhub",
): NovelUIRenderer<VideoProps> {
  return {
    component: "video",
    variant,
    styles: common + styles,
    validate(value): value is VideoProps {
      const p = value as VideoProps;
      return (
        !!p &&
        [p.title, p.channel, p.duration, p.views, p.uploaded].every(
          (x) => typeof x === "string",
        ) &&
        (p.likes === undefined ||
          (typeof p.likes === "number" && p.likes >= 0)) &&
        (p.comments === undefined ||
          (Array.isArray(p.comments) && p.comments.every(isPlatformComment)))
      );
    },
    render(props) {
      const root = element(
          "article",
          `novel-ui video-page video-page--${variant}`,
        ),
        player = element("div", "video-page__player"),
        url = safeUrl(props.thumbnail);
      if (url) {
        const img = element("img");
        img.src = url;
        img.alt = props.thumbnailAlt ?? "视频缩略图";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        player.append(img);
      } else
        player.append(
          element(
            "span",
            "video-page__placeholder",
            props.thumbnailAlt ?? "视频缩略图",
          ),
        );
      player.append(
        element("span", "video-page__play", "▶"),
        element("span", "video-page__duration", props.duration),
      );
      const brand = variant === "youtube" ? "YouTube" : "Pornhub";
      const header = element("header", "video-page__brand", brand),
        title = element("h2", "video-page__title", props.title),
        meta = element(
          "div",
          "video-page__meta",
          `${props.views} 次观看 · ${props.uploaded}`,
        ),
        channel = element("div", "video-page__channel");
      channel.append(
        renderDefaultAvatar("video-page__avatar",`${props.channel}的默认头像`),
        element("strong", "", props.channel + (props.verified ? " ✓" : "")),
      );
      if (props.subscribers)
        channel.append(
          element("span", "video-page__subscribers", props.subscribers),
        );
      channel.append(
        element(
          "span",
          "video-page__subscribe",
          variant === "youtube" ? "订阅" : "关注",
        ),
      );
      root.append(header, player, title, meta, channel);
      if (props.category || props.description)
        root.append(
          element(
            "div",
            "video-page__description",
            [props.category, props.description].filter(Boolean).join(" · "),
          ),
        );
      root.append(
        element(
          "footer",
          "video-page__stats",
          `👍 ${props.likes ?? 0}　↗ 分享　⋯`,
        ),
      );
      if (props.comments?.length)
        root.append(renderPlatformComments(props.comments));
      return root;
    },
  };
}
export const YouTubeRenderer = createVideoRenderer("youtube");
export const PornhubRenderer = createVideoRenderer("pornhub");
