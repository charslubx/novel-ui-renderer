import { element } from "../../utils/dom";

export function renderDefaultPersonAvatar(className = "person-avatar"): HTMLElement {
  const avatar = element("div", className);
  avatar.setAttribute("role", "img");
  avatar.setAttribute("aria-label", "默认人物头像");
  avatar.append(element("span", `${className}__head`), element("span", `${className}__body`));
  return avatar;
}
