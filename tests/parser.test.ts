import { describe, expect, it, vi } from "vitest";
import { parseNovelUIBlocks } from "../src/parser/novel-ui-parser";

const block=(component="chat",variant="kakao")=>`:::novel-ui {"schema":"novel-ui","version":"1.0","component":"${component}","variant":"${variant}","props":{}} :::`;
describe("Novel UI parser",()=>{
  it("parses valid JSON",()=>expect(parseNovelUIBlocks(block())).toHaveLength(1));
  it("parses multiple blocks",()=>expect(parseNovelUIBlocks(`正文 ${block()} 正文 ${block("document","medical")}`)).toHaveLength(2));
  it("ignores an incomplete streaming block",()=>expect(()=>parseNovelUIBlocks(':::novel-ui {"component":')).not.toThrow());
  it("ignores malformed JSON",()=>{vi.spyOn(console,"error").mockImplementation(()=>{}); expect(parseNovelUIBlocks(":::novel-ui {nope} :::")).toEqual([]);});
  it("accepts unsupported renderer keys at parser level",()=>expect(parseNovelUIBlocks(block("chat","wechat"))[0].variant).toBe("wechat"));
});
