import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/fivech.css?inline";

interface FiveChPost {
  number: number;
  name: string;
  timestamp: string;
  id?: string;
  text: string;
}

interface FiveChProps {
  board?: string;
  title: string;
  threadId?: string;
  posts: FiveChPost[];
}

const isPost = (value: unknown): value is FiveChPost => {
  const post = value as FiveChPost;
  return !!post && Number.isInteger(post.number) && post.number > 0 &&
    [post.name, post.timestamp, post.text].every((item) => typeof item === "string") &&
    (post.id === undefined || typeof post.id === "string");
};

export const FiveChRenderer: NovelUIRenderer<FiveChProps> = {
  component: "article",
  variant: "5ch",
  styles: common + styles,
  validate(value): value is FiveChProps {
    const props = value as FiveChProps;
    return !!props && typeof props.title === "string" &&
      Array.isArray(props.posts) && props.posts.every(isPost) &&
      (props.board === undefined || typeof props.board === "string") &&
      (props.threadId === undefined || typeof props.threadId === "string");
  },
  render(props) {
    const root = element("article", "novel-ui fivech");
    const header = element("header", "fivech__header");
    header.append(
      element("div", "fivech__board", props.board ?? "5ちゃんねる"),
      element("h2", "fivech__title", props.title),
    );
    if (props.threadId) header.append(element("div", "fivech__thread-id", `スレッド ${props.threadId}`));
    root.append(header);
    const thread = element("section", "fivech__thread");
    for (const post of props.posts) {
      const item = element("div", "fivech__post");
      const meta = element("div", "fivech__meta");
      meta.append(
        element("span", "fivech__number", String(post.number)),
        element("span", "fivech__name", post.name),
        element("span", "fivech__time", post.timestamp),
      );
      if (post.id) meta.append(element("span", "fivech__id", `ID:${post.id}`));
      item.append(meta, element("div", "fivech__text", post.text));
      thread.append(item);
    }
    root.append(thread, element("footer", "fivech__footer", "5ch STYLE · FICTIONAL THREAD"));
    return root;
  },
};
