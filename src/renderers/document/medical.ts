import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/medical.css?inline";

interface MedicalField { label:string; value:string; wide?:boolean; }
interface MedicalProps { hospital: string; department: string; patient: string; reportTitle: string; fields: MedicalField[]; findings: string; }
const wideLabels = new Set(["clinical history", "history", "clinical indication", "indication", "reason for examination"]);
export const MedicalRenderer: NovelUIRenderer<MedicalProps> = {
  component: "document", variant: "medical", styles: common + styles,
  validate(value): value is MedicalProps { const p = value as MedicalProps; return !!p && [p.hospital,p.department,p.patient,p.reportTitle,p.findings].every((x)=>typeof x === "string") && Array.isArray(p.fields) && p.fields.every((f)=>f && typeof f.label === "string" && typeof f.value === "string" && (f.wide === undefined || typeof f.wide === "boolean")); },
  render(props) {
    const root = element("article", "novel-ui medical");
    root.append(element("div", "medical__hospital", props.hospital), element("div", "medical__department", props.department), element("h2", "medical__title", props.reportTitle));
    const fields = element("div", "medical__fields");
    [{label:"Patient",value:props.patient}, ...props.fields].forEach(({label,value,wide}) => {
      const normalized = label.trim().toLowerCase();
      const isWide = wide === true || wideLabels.has(normalized) || value.length > 42;
      const classes = ["medical__field", isWide ? "medical__field--wide" : "", normalized === "examination" ? "medical__field--examination" : ""].filter(Boolean).join(" ");
      const field=element("div",classes);
      field.append(element("span","medical__label",`${label}:`),element("span","medical__value",value)); fields.append(field);
    });
    root.append(fields, element("div", "medical__findings-title", "Findings"), element("div", "medical__findings", props.findings)); return root;
  },
};
