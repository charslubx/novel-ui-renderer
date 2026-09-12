import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/weibo.css?inline";

interface WeiboProps { displayName:string; handle?:string; verified?:boolean; timestamp:string; source?:string; text:string; reposts?:number; comments?:number; likes?:number; }
const optionalNumber=(value:unknown)=>value===undefined || (typeof value==="number" && value>=0);
export const WeiboRenderer:NovelUIRenderer<WeiboProps>={
  component:"social",variant:"weibo-post",styles:common+styles,
  validate(value):value is WeiboProps {const p=value as WeiboProps; return !!p && [p.displayName,p.timestamp,p.text].every((x)=>typeof x==="string") && [p.reposts,p.comments,p.likes].every(optionalNumber);},
  render(props){const root=element("article","novel-ui weibo"),author=element("div","weibo__author"); author.append(element("span","weibo__name",props.displayName)); if(props.verified) author.append(element("span","weibo__verified","V")); if(props.handle) author.append(element("span","weibo__handle",props.handle)); const meta=[props.timestamp,props.source ? `来自 ${props.source}`:""].filter(Boolean).join(" · "); const stats=element("footer","weibo__stats"); [["转发",props.reposts],["评论",props.comments],["赞",props.likes]].forEach(([label,value])=>stats.append(element("span","",`${label} ${value ?? 0}`))); root.append(author,element("div","weibo__meta",meta),element("div","weibo__text",props.text),stats); return root;}
};
