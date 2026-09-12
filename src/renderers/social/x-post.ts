import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/x-post.css?inline";

interface XPostProps { displayName:string; handle:string; verified?:boolean; text:string; timestamp:string; replies?:number; reposts?:number; likes?:number; views?:number; }
const optionalNumber=(value:unknown)=>value===undefined || (typeof value==="number" && value>=0);
export const XPostRenderer: NovelUIRenderer<XPostProps> = {
  component:"social", variant:"x-post", styles:common+styles,
  validate(value):value is XPostProps { const p=value as XPostProps; return !!p && [p.displayName,p.handle,p.text,p.timestamp].every((x)=>typeof x==="string") && [p.replies,p.reposts,p.likes,p.views].every(optionalNumber); },
  render(props) {
    const root=element("article","novel-ui x-post"), author=element("div","x-post__author");
    author.append(element("span","x-post__name",props.displayName));
    if(props.verified) author.append(element("span","x-post__verified","●"));
    author.append(element("span","x-post__handle",`@${props.handle.replace(/^@/,"")}`),element("span","x-post__time",`· ${props.timestamp}`));
    const stats=element("footer","x-post__stats");
    [["回复",props.replies],["转发",props.reposts],["喜欢",props.likes],["浏览",props.views]].forEach(([label,value])=>stats.append(element("span","",`${label} ${value ?? 0}`)));
    root.append(author,element("div","x-post__text",props.text),stats); return root;
  }
};
