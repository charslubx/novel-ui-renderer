import assert from "node:assert/strict";
import test from "node:test";
import { callTool, handleRpc, validateNovelUIBlock } from "../server.mjs";

test("initialize returns MCP server capabilities", async () => {
  const response = await handleRpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18" }
  });
  assert.equal(response.result.serverInfo.name, "novel-runtime-mcp");
  assert.equal(response.result.protocolVersion, "2025-06-18");
  assert.ok(response.result.capabilities.tools);
});

test("tools/list exposes core novel tools", async () => {
  const response = await handleRpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  const names = response.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, [
    "get_story_context",
    "get_character",
    "get_character_knowledge",
    "get_open_loops",
    "check_repetition",
    "validate_novel_ui"
  ]);
});

test("character knowledge keeps unknown facts isolated", async () => {
  const result = await callTool("get_character_knowledge", { characterId: "sana" });
  assert.equal(result.character, "凑崎纱夏");
  assert.ok(result.unknown.includes("徐以炫昨晚与金旼炡见面"));
});

test("repetition checker catches recent patterns and style phrases", async () => {
  const result = await callTool("check_repetition", { text: "她呼吸一滞，两人又在医院走廊争执。" });
  assert.equal(result.pass, false);
  assert.ok(result.matchedPatterns.includes("医院走廊争执"));
  assert.ok(result.matchedPhrases.includes("呼吸一滞"));
});

test("Novel UI validator accepts registered renderer and rejects unknown renderer", () => {
  const valid = validateNovelUIBlock({
    schema: "novel-ui",
    version: "1.0",
    component: "social",
    variant: "weibo-post",
    props: { displayName: "test" }
  });
  assert.equal(valid.valid, true);

  const invalid = validateNovelUIBlock({
    schema: "novel-ui",
    version: "1.0",
    component: "social",
    variant: "does-not-exist",
    props: {}
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /unsupported renderer/);
});
