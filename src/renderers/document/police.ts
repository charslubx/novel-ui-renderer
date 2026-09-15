import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/police.css?inline";

interface PoliceField { label: string; value: string; }
interface PoliceDocumentProps {
  agency: string;
  division: string;
  documentTitle: string;
  caseNumber: string;
  date: string;
  subject?: string;
  officer?: string;
  fields?: PoliceField[];
  summary: string;
  notes?: string;
}

const isField = (value: unknown): value is PoliceField => {
  const field = value as PoliceField;
  return !!field && typeof field.label === "string" && typeof field.value === "string";
};

function validatePolice(value: unknown): value is PoliceDocumentProps {
  const props = value as PoliceDocumentProps;
  return !!props
    && [props.agency, props.division, props.documentTitle, props.caseNumber, props.date, props.summary].every((field) => typeof field === "string")
    && (props.subject === undefined || typeof props.subject === "string")
    && (props.officer === undefined || typeof props.officer === "string")
    && (props.notes === undefined || typeof props.notes === "string")
    && (props.fields === undefined || (Array.isArray(props.fields) && props.fields.every(isField)));
}

function renderPolice(props: PoliceDocumentProps, locale: "kr" | "jp") {
  const labels = locale === "kr"
    ? { country: "대한민국 · 경찰 문서", case: "사건번호", date: "작성일", subject: "관련자", officer: "담당관", summary: "사건 개요", notes: "비고", footer: "소설용 가상 경찰 문서" }
    : { country: "日本国 · 警察文書", case: "事件番号", date: "作成日", subject: "関係者", officer: "担当官", summary: "事案概要", notes: "備考", footer: "小説用の架空警察文書" };
  const root = element("article", `novel-ui police police--${locale}`);
  const masthead = element("header", "police__masthead");
  masthead.append(element("div", "police__mark", locale === "kr" ? "경" : "警"));
  const agency = element("div", "police__agency");
  agency.append(element("div", "police__country", labels.country), element("h2", "", props.agency), element("div", "", props.division));
  masthead.append(agency);
  root.append(masthead, element("h1", "police__title", props.documentTitle));

  const meta = element("dl", "police__meta");
  const entries: PoliceField[] = [
    { label: labels.case, value: props.caseNumber },
    { label: labels.date, value: props.date },
    ...(props.subject ? [{ label: labels.subject, value: props.subject }] : []),
    ...(props.officer ? [{ label: labels.officer, value: props.officer }] : []),
    ...(props.fields ?? []),
  ];
  for (const field of entries) {
    meta.append(element("dt", "", field.label), element("dd", "", field.value));
  }
  root.append(meta, element("h3", "police__section-title", labels.summary), element("div", "police__summary", props.summary));
  if (props.notes) root.append(element("h3", "police__section-title", labels.notes), element("div", "police__notes", props.notes));
  root.append(element("footer", "police__footer", labels.footer));
  return root;
}

export const KoreaPoliceRenderer: NovelUIRenderer<PoliceDocumentProps> = {
  component: "document", variant: "police-kr", styles: common + styles,
  validate: validatePolice,
  render: (props) => renderPolice(props, "kr"),
};

export const JapanPoliceRenderer: NovelUIRenderer<PoliceDocumentProps> = {
  component: "document", variant: "police-jp", styles: common + styles,
  validate: validatePolice,
  render: (props) => renderPolice(props, "jp"),
};
