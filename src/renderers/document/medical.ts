import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/medical.css?inline";

interface MedicalProps { hospital: string; department: string; patient: string; reportTitle: string; fields: {label:string;value:string}[]; findings: string; }
export const MedicalRenderer: NovelUIRenderer<MedicalProps> = {
  component: "document", variant: "medical", styles: common + styles,
  validate(value): value is MedicalProps { const p = value as MedicalProps; return !!p && [p.hospital,p.department,p.patient,p.reportTitle,p.findings].every((x)=>typeof x === "string") && Array.isArray(p.fields) && p.fields.every((f)=>f && typeof f.label === "string" && typeof f.value === "string"); },
  render(props) {
    const root = element("article", "novel-ui medical");
    root.append(element("div", "medical__hospital", props.hospital), element("div", "medical__department", props.department), element("h2", "medical__title", props.reportTitle));
    const fields = element("div", "medical__fields");
    [{label:"Patient",value:props.patient}, ...props.fields].forEach(({label,value}) => { const field=element("div","medical__field"); field.append(element("span","medical__label",`${label}:`),element("span","medical__value",value)); fields.append(field); });
    root.append(fields, element("div", "medical__findings-title", "Findings"), element("div", "medical__findings", props.findings)); return root;
  },
};
