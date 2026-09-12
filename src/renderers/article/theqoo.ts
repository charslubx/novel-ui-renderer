import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/theqoo.css?inline";

interface Comment { id:string; author:string; text:string; time?:string; likes?:number; }
interface TheqooProps { category?:string; title:string; author?:string; date:string; views?:number; content:string; comments?:Comment[]; }
const isComment=(value:unknown):value is Comment=>{const c=value as Comment; return !!c && typeof c.id==="string" && typeof c.author==="string" && typeof c.text==="string" && (c.likes===undefined || typeof c.likes==="number");};
export const TheqooRenderer:NovelUIRenderer<TheqooProps>={
  component:"article",variant:"theqoo",styles:common+styles,
  validate(value):value is TheqooProps {const p=value as TheqooProps; return !!p && typeof p.title==="string" && typeof p.date==="string" && typeof p.content==="string" && (p.comments===undefined || Array.isArray(p.comments) && p.comments.every(isComment));},
  render(props){
    const root=element("article","novel-ui theqoo"); root.append(element("div","theqoo__bar","theqoo · HOT 게시판"));
    const header=element("header","theqoo__header");
    if(props.category) header.append(element("div","theqoo__category",props.category));
    header.append(element("h2","theqoo__title",props.title),element("div","theqoo__meta",`${props.author ?? "무명의 더쿠"} · ${props.date} · 조회 ${props.views ?? 0}`));
    root.append(header,element("div","theqoo__content",props.content));
    if(props.comments?.length){const comments=element("section","theqoo__comments"); props.comments.forEach((c,index)=>{const item=element("div","theqoo__comment"),meta=element("div","theqoo__comment-meta",`${index+1}. ${c.author}${c.time ? ` · ${c.time}`:""}`); if(c.likes!==undefined) meta.append(element("span","theqoo__likes",`♥ ${c.likes}`)); item.append(meta,element("div","theqoo__comment-text",c.text)); comments.append(item);}); root.append(comments);}
    return root;
  }
};
