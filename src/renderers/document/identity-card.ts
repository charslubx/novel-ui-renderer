import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import { renderDefaultPersonAvatar } from "../shared/person-avatar";
import common from "../../styles/common.css?inline";
import styles from "../../styles/identity.css?inline";
interface IdentityCardProps {
  country: string;
  documentName?: string;
  fullName: string;
  idNumber: string;
  birthDate: string;
  sex?: string;
  nationality?: string;
  validFrom?: string;
  validUntil: string;
  authority?: string;
}
export const IdentityCardRenderer: NovelUIRenderer<IdentityCardProps> = {
  component: "document",
  variant: "identity-card",
  styles: common + styles,
  validate(value): value is IdentityCardProps {
    const p = value as IdentityCardProps;
    return (
      !!p &&
      [p.country, p.fullName, p.idNumber, p.birthDate, p.validUntil].every(
        (x) => typeof x === "string",
      )
    );
  },
  render(props) {
    const root = element("article", "novel-ui identity-card"),
      header = element("header", "identity-card__header");
    header.append(
      element("div", "identity-card__country", props.country),
      element(
        "div",
        "identity-card__kind",
        props.documentName ?? "IDENTITY CARD",
      ),
    );
    const body = element("section", "identity-card__body"),
      fields = element("div", "identity-card__fields");
    [
      ["NAME", props.fullName, true],
      ["ID NUMBER", props.idNumber, true],
      ["DATE OF BIRTH", props.birthDate],
      ["SEX", props.sex],
      ["NATIONALITY", props.nationality],
      ["VALID FROM", props.validFrom],
    ]
      .filter(([, value]) => value)
      .forEach(([label, value, wide]) => {
        const field = element(
          "div",
          `identity-card__field${wide ? " identity-card__field--wide" : ""}`,
        );
        field.append(
          element("div", "identity-card__label", String(label)),
          element("div", "identity-card__value", String(value)),
        );
        fields.append(field);
      });
    body.append(fields, renderDefaultPersonAvatar());
    const footer = element("footer", "identity-card__footer");
    footer.append(
      element("span", "", props.authority ?? "Fictional Authority"),
      element("span", "", `VALID UNTIL ${props.validUntil}`),
    );
    root.append(header, body, footer);
    return root;
  },
};
