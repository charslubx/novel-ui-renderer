import { element } from "../../utils/dom";

export function renderDefaultAvatar(className = "default-avatar", label = "默认头像"): HTMLElement {
  const avatar = element("div", `${className} novel-default-avatar`);
  avatar.setAttribute("role", "img"); avatar.setAttribute("aria-label", label);
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox","0 0 64 64"); svg.setAttribute("aria-hidden","true");
  const head=document.createElementNS(svg.namespaceURI,"circle"); head.setAttribute("cx","32"); head.setAttribute("cy","23"); head.setAttribute("r","10");
  const shoulders=document.createElementNS(svg.namespaceURI,"path"); shoulders.setAttribute("d","M14 51c2-11 9-17 18-17s16 6 18 17");
  svg.append(head,shoulders); avatar.append(svg); return avatar;
}

export function renderDefaultPersonAvatar(
  className = "person-avatar",
): HTMLElement {
  return renderDefaultAvatar(className, "默认人物头像");
}
