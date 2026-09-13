import { describe, expect, it, vi } from "vitest";
import { parseNovelUIBlocks } from "../src/parser/novel-ui-parser";

const legacyBlock=(component="chat",variant="kakao")=>`:::novel-ui {"schema":"novel-ui","version":"1.0","component":"${component}","variant":"${variant}","props":{}} :::`;
const bracketBlock=(component="chat",variant="kakao")=>`[[novel-ui]] {"schema":"novel-ui","version":"1.0","component":"${component}","variant":"${variant}","props":{}} [[/novel-ui]]`;
describe("Novel UI parser",()=>{
  it("parses the recommended bracket markers",()=>expect(parseNovelUIBlocks(bracketBlock())).toHaveLength(1));
  it("keeps support for legacy colon markers",()=>expect(parseNovelUIBlocks(legacyBlock())).toHaveLength(1));
  it("parses mixed marker styles in source order",()=>{const parsed=parseNovelUIBlocks(`正文 ${bracketBlock()} 正文 ${legacyBlock("document","medical")}`);expect(parsed.map(({component})=>component)).toEqual(["chat","document"]);});
  it("ignores an incomplete streaming block",()=>expect(()=>parseNovelUIBlocks(':::novel-ui {"component":')).not.toThrow());
  it("ignores an incomplete bracket streaming block",()=>expect(()=>parseNovelUIBlocks('[[novel-ui]] {"component":')).not.toThrow());
  it("ignores malformed JSON",()=>{vi.spyOn(console,"error").mockImplementation(()=>{}); expect(parseNovelUIBlocks("[[novel-ui]] {nope} [[/novel-ui]]")).toEqual([]);});
  it("accepts unsupported renderer keys at parser level",()=>expect(parseNovelUIBlocks(bracketBlock("chat","wechat"))[0].variant).toBe("wechat"));
});
