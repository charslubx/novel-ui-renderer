import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { renderDefaultAvatar } from "../shared/person-avatar";
import common from "../../styles/common.css?inline";
import styles from "../../styles/x-post.css?inline";
interface Trend {
  id: string;
  category: string;
  title: string;
  posts?: number;
}
interface XTrendsProps {
  searchPlaceholder?: string;
  activeTab?: "explore" | "trending" | "news" | "sports" | "entertainment";
  trends: Trend[];
}
const isTrend = (value: unknown): value is Trend => {
  const t = value as Trend;
  return (
    !!t &&
    typeof t.id === "string" &&
    typeof t.category === "string" &&
    typeof t.title === "string" &&
    (t.posts === undefined || (typeof t.posts === "number" && t.posts >= 0))
  );
};
export const XTrendsRenderer: NovelUIRenderer<XTrendsProps> = {
  component: "social",
  variant: "x-trends",
  styles: common + styles,
  validate(value): value is XTrendsProps {
    const p = value as XTrendsProps;
    return !!p && Array.isArray(p.trends) && p.trends.every(isTrend);
  },
  render(props) {
    const shell = element("section", "novel-ui x-shell"),
      search = element("header", "x-search");
    search.append(
      renderDefaultAvatar("x-search__avatar"),
      element(
        "div",
        "x-search__box",
        `⌕　${props.searchPlaceholder ?? "搜索"}`,
      ),
      element("span", "x-search__gear", "⚙"),
    );
    const tabs = element("nav", "x-tabs"),
      active = props.activeTab ?? "explore";
    [
      ["explore", "探索"],
      ["trending", "当前趋势"],
      ["news", "新闻"],
      ["sports", "体育"],
      ["entertainment", "娱乐"],
    ].forEach(([key, label]) =>
      tabs.append(
        element(
          "span",
          `x-tab ${active === key ? "x-tab--active" : ""}`,
          label,
        ),
      ),
    );
    shell.append(search, tabs);
    props.trends.forEach((trend) => {
      const item = element("div", "x-trend");
      item.append(
        element("div", "x-trend__category", trend.category),
        element("div", "x-trend__title", trend.title),
      );
      if (trend.posts !== undefined)
        item.append(
          element(
            "div",
            "x-trend__posts",
            `${trend.posts.toLocaleString()} 帖子`,
          ),
        );
      item.append(element("span", "x-trend__more", "⋮"));
      shell.append(item);
    });
    return shell;
  },
};
