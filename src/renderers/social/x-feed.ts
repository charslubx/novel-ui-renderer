import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { isXPostProps, renderXPost, type XPostProps } from "./x-post";
import common from "../../styles/common.css?inline";
import styles from "../../styles/x-post.css?inline";
interface XFeedProps{title?:string;activeTab?:"for-you"|"following";posts:XPostProps[];}
export const XFeedRenderer:NovelUIRenderer<XFeedProps>={component:"social",variant:"x-feed",styles:common+styles,validate(value):value is XFeedProps{const p=value as XFeedProps;return !!p&&Array.isArray(p.posts)&&p.posts.every(isXPostProps)&&(p.title===undefined||typeof p.title==="string");},render(props){const shell=element("section","novel-ui x-shell"),header=element("header","x-app-header",props.title??"首页");header.append(element("span","x-app-header__avatar"),element("span","x-app-header__action","⚙"));const tabs=element("nav","x-tabs");tabs.append(element("span",`x-tab ${props.activeTab!=="following"?"x-tab--active":""}`,"为你推荐"),element("span",`x-tab ${props.activeTab==="following"?"x-tab--active":""}`,"正在关注"));shell.append(header,tabs);if(props.posts.length)props.posts.forEach((post)=>shell.append(renderXPost(post)));else shell.append(element("div","x-feed-empty","暂无帖子"));return shell;}};
