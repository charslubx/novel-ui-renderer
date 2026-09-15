import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/news.css?inline";

interface NewsProps {
  publication: string;
  category?: string;
  title: string;
  subtitle?: string;
  author?: string;
  publishedAt: string;
  image?: string;
  imageAlt?: string;
  caption?: string;
  paragraphs: string[];
  tags?: string[];
}

function safeUrl(value?: string) {
  if (!value) return;
  try {
    const url = new URL(value, location.href);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch { return; }
}

export const NewsRenderer: NovelUIRenderer<NewsProps> = {
  component: "article",
  variant: "news",
  styles: common + styles,
  validate(value): value is NewsProps {
    const props = value as NewsProps;
    return !!props
      && [props.publication, props.title, props.publishedAt].every((field) => typeof field === "string")
      && Array.isArray(props.paragraphs)
      && props.paragraphs.length > 0
      && props.paragraphs.every((paragraph) => typeof paragraph === "string")
      && [props.category, props.subtitle, props.author, props.image, props.imageAlt, props.caption]
        .every((field) => field === undefined || typeof field === "string")
      && (props.tags === undefined || (Array.isArray(props.tags) && props.tags.every((tag) => typeof tag === "string")));
  },
  render(props) {
    const root = element("article", "novel-ui news");
    const masthead = element("header", "news__masthead");
    masthead.append(element("div", "news__publication", props.publication), element("div", "news__edition", "FICTIONAL NEWS · DIGITAL EDITION"));
    root.append(masthead);
    if (props.category) root.append(element("div", "news__category", props.category));
    root.append(element("h1", "news__title", props.title));
    if (props.subtitle) root.append(element("p", "news__subtitle", props.subtitle));
    root.append(element("div", "news__byline", [props.author, props.publishedAt].filter(Boolean).join(" · ")));

    const imageUrl = safeUrl(props.image);
    if (imageUrl || props.imageAlt) {
      const media = element("figure", "news__media");
      if (imageUrl) {
        const image = element("img");
        image.src = imageUrl; image.alt = props.imageAlt ?? "新闻配图"; image.loading = "lazy"; image.referrerPolicy = "no-referrer";
        media.append(image);
      } else media.append(element("div", "news__placeholder", props.imageAlt ?? "新闻配图"));
      if (props.caption) media.append(element("figcaption", "", props.caption));
      root.append(media);
    }
    const body = element("div", "news__body");
    props.paragraphs.forEach((paragraph) => body.append(element("p", "", paragraph)));
    root.append(body);
    if (props.tags?.length) root.append(element("div", "news__tags", props.tags.map((tag) => `#${tag}`).join("  ")));
    return root;
  },
};
