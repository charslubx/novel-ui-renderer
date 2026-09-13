import { describe, expect, it } from "vitest";
import { FiveChRenderer } from "../src/renderers/article/fivech";
import { TheqooRenderer } from "../src/renderers/article/theqoo";

describe("forum renderers", () => {
  it("renders a 5ch thread with anonymous post metadata", () => {
    const props = { title: "テストスレ", posts: [{ number: 1, name: "名無しさん", timestamp: "2026/09/13 18:42", id: "ABC123", text: ">>2\n本文" }] };
    expect(FiveChRenderer.validate(props)).toBe(true);
    const result = FiveChRenderer.render(props, { raw: "", debug: false });
    expect(result.querySelectorAll(".fivech__post")).toHaveLength(1);
    expect(result.textContent).toContain("ID:ABC123");
  });

  it("keeps the existing theqoo renderer available", () => {
    const props = { title: "제목", date: "2026.09.13", content: "본문" };
    expect(TheqooRenderer.validate(props)).toBe(true);
  });
});
