import { describe, expect, it } from "vitest";
import { LockscreenRenderer } from "../src/renderers/phone/lockscreen";
import { InstagramDmRenderer } from "../src/renderers/social/instagram-dm";
import { JapanPoliceRenderer, KoreaPoliceRenderer } from "../src/renderers/document/police";
import { NewsRenderer } from "../src/renderers/article/news";

describe("new story renderers", () => {
  it("renders multiple lock-screen notifications", () => {
    const props = { time: "23:47", date: "9月15日", notifications: [{ id: "1", app: "信息", title: "纱夏", text: "还没睡。" }] };
    expect(LockscreenRenderer.validate(props)).toBe(true);
    expect(LockscreenRenderer.render(props, { raw: "", debug: false }).querySelectorAll(".lockscreen__notification")).toHaveLength(1);
  });

  it("renders Instagram DM sides and default avatar", () => {
    const props = { title: "Sana", messages: [{ id: "1", sender: "sana", side: "left" as const, text: "照片不要发出去。" }, { id: "2", sender: "me", side: "right" as const, text: "知道了。", status: "已读" }] };
    const result = InstagramDmRenderer.render(props, { raw: "", debug: false });
    expect(InstagramDmRenderer.validate(props)).toBe(true);
    expect(result.querySelectorAll(".instagram-dm__bubble")).toHaveLength(2);
    expect(result.querySelector(".instagram-dm__avatar svg")).not.toBeNull();
  });

  const policeProps = { agency: "가상 경찰청", division: "형사과", documentTitle: "보고서", caseNumber: "A-1", date: "2026.09.15", summary: "사건 개요" };
  it("renders a Korean police document", () => {
    expect(KoreaPoliceRenderer.validate(policeProps)).toBe(true);
    expect(KoreaPoliceRenderer.render(policeProps, { raw: "", debug: false }).textContent).toContain("대한민국");
    expect(KoreaPoliceRenderer.render(policeProps, { raw: "", debug: false }).querySelector(".police__watermark")?.textContent).toContain("가상 문서");
  });
  it("renders a Japanese police document", () => {
    expect(JapanPoliceRenderer.validate(policeProps)).toBe(true);
    expect(JapanPoliceRenderer.render(policeProps, { raw: "", debug: false }).textContent).toContain("日本国");
    expect(JapanPoliceRenderer.render(policeProps, { raw: "", debug: false }).querySelector(".police__watermark")?.textContent).toContain("架空文書");
  });

  it("renders a news article and rejects an empty body", () => {
    const props = { publication: "Daily", title: "Headline", publishedAt: "Now", paragraphs: ["First paragraph"] };
    expect(NewsRenderer.validate(props)).toBe(true);
    expect(NewsRenderer.render(props, { raw: "", debug: false }).textContent).toContain("First paragraph");
    expect(NewsRenderer.validate({ ...props, paragraphs: [] })).toBe(false);
  });
});
