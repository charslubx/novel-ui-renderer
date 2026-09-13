import { describe,expect,it } from "vitest";
import { MedicalRenderer } from "../src/renderers/document/medical";

describe("medical renderer layout",()=>{
  it("spans clinical history across the complete details row",()=>{
    const props={hospital:"Hospital",department:"Thoracic Surgery",patient:"徐以炫",reportTitle:"CT Report",fields:[{label:"Date",value:"2026-09-13"},{label:"Examination",value:"Chest CT Plain Scan"},{label:"Clinical History",value:"Previous left thoracic trauma and surgery, chronic recurrent pain"}],findings:"Stable."};
    expect(MedicalRenderer.validate(props)).toBe(true);
    const result=MedicalRenderer.render(props,{raw:"",debug:false});
    const fields=[...result.querySelectorAll(".medical__field")];
    expect(fields.find((field)=>field.textContent?.startsWith("Clinical History"))?.classList.contains("medical__field--wide")).toBe(true);
    expect(fields.find((field)=>field.textContent?.startsWith("Examination"))?.classList.contains("medical__field--examination")).toBe(true);
  });
});
