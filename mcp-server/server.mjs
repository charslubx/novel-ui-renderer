import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const MODERN_PROTOCOL_VERSION = "2026-07-28";
const LEGACY_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const DEFAULT_LEGACY_PROTOCOL_VERSION = "2025-11-25";
const SERVER_INFO = { name: "novel-runtime-mcp", title: "Novel Runtime MCP", version: "0.2.0" };
const SERVER_CAPABILITIES = { tools: { listChanged: false } };
const SERVER_INSTRUCTIONS = "Read-only novel writing context tools for story state, character knowledge boundaries, unresolved plot hooks, repetition checks, and Novel UI validation.";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_PATH = path.join(__dirname, "data", "default-project.json");

const KNOWN_VARIANTS = new Set([
  "chat:kakao",
  "chat:imessage",
  "phone:lockscreen",
  "document:medical",
  "social:x-post",
  "social:x-feed",
  "social:x-notifications",
  "social:x-trends",
  "article:theqoo",
  "article:5ch",
  "article:news",
  "social:weibo-post",
  "social:instagram-post",
  "social:instagram-dm",
  "social:onlyfans-post",
  "video:youtube",
  "video:pornhub",
  "ticket:flight",
  "ticket:ferry",
  "ticket:rail",
  "ticket:bus",
  "document:identity-card",
  "document:work-card",
  "document:police-kr",
  "document:police-jp"
]);

export async function loadProject(projectPath = process.env.NOVEL_PROJECT_FILE || DEFAULT_PROJECT_PATH) {
  const raw = await readFile(projectPath, "utf8");
  return JSON.parse(raw);
}

export function validateNovelUIBlock(block) {
  const errors = [];
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return { valid: false, errors: ["block must be an object"] };
  }
  if (block.schema !== "novel-ui") errors.push('schema must equal "novel-ui"');
  if (block.version !== "1.0") errors.push('version must equal "1.0"');
  if (typeof block.component !== "string" || !block.component) errors.push("component is required");
  if (typeof block.variant !== "string" || !block.variant) errors.push("variant is required");
  if (!block.props || typeof block.props !== "object" || Array.isArray(block.props)) errors.push("props must be an object");

  if (typeof block.component === "string" && typeof block.variant === "string") {
    const key = `${block.component}:${block.variant}`;
    if (!KNOWN_VARIANTS.has(key)) errors.push(`unsupported renderer: ${key}`);
  }

  return { valid: errors.length === 0, errors };
}

export function listTools() {
  return [
    {
      name: "get_story_context",
      description: "Return the compact current writing context for the configured novel project.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      name: "get_character",
      description: "Return one character profile from the current novel project.",
      inputSchema: {
        type: "object",
        properties: { characterId: { type: "string", description: "Character id or name." } },
        required: ["characterId"],
        additionalProperties: false
      }
    },
    {
      name: "get_character_knowledge",
      description: "Return known, suspected, unknown and false-belief facts for one character.",
      inputSchema: {
        type: "object",
        properties: { characterId: { type: "string", description: "Character id or name." } },
        required: ["characterId"],
        additionalProperties: false
      }
    },
    {
      name: "get_open_loops",
      description: "Return unresolved plot hooks and conflicts that can be advanced in future chapters.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
      name: "check_repetition",
      description: "Check draft text against recently used plot patterns and style phrases stored in project state.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false
      }
    },
    {
      name: "validate_novel_ui",
      description: "Validate the base Novel UI schema and ensure the component/variant has a registered renderer.",
      inputSchema: {
        type: "object",
        properties: { block: { type: "object", additionalProperties: true } },
        required: ["block"],
        additionalProperties: false
      }
    }
  ];
}

function findCharacter(project, characterId) {
  const needle = String(characterId).trim().toLowerCase();
  return (project.characters || []).find((item) =>
    String(item.id || "").toLowerCase() === needle || String(item.name || "").toLowerCase() === needle
  );
}

export async function callTool(name, args = {}, projectPath) {
  const project = await loadProject(projectPath);

  switch (name) {
    case "get_story_context":
      return {
        project: { id: project.id, title: project.title },
        chapter: project.currentState?.chapter ?? null,
        pov: project.currentState?.pov ?? null,
        scene: project.currentState?.scene ?? null,
        hardRules: project.hardRules || [],
        relevantFacts: project.currentState?.relevantFacts || [],
        openLoops: project.openLoops || [],
        recentPatterns: project.recentPatterns || []
      };
    case "get_character": {
      const character = findCharacter(project, args.characterId);
      if (!character) throw new Error(`character not found: ${args.characterId}`);
      const { knowledge, ...profile } = character;
      return profile;
    }
    case "get_character_knowledge": {
      const character = findCharacter(project, args.characterId);
      if (!character) throw new Error(`character not found: ${args.characterId}`);
      return { character: character.name, ...(character.knowledge || {}) };
    }
    case "get_open_loops":
      return { openLoops: project.openLoops || [] };
    case "check_repetition": {
      const text = String(args.text || "");
      const matchedPatterns = (project.recentPatterns || []).filter((pattern) => text.includes(pattern));
      const matchedPhrases = (project.style?.avoidPhrases || []).filter((phrase) => text.includes(phrase));
      return {
        pass: matchedPatterns.length === 0 && matchedPhrases.length === 0,
        matchedPatterns,
        matchedPhrases
      };
    }
    case "validate_novel_ui":
      return validateNovelUIBlock(args.block);
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function serverMeta() {
  return { "io.modelcontextprotocol/serverInfo": SERVER_INFO };
}

function toolResult(data, modern = false) {
  return {
    ...(modern ? { resultType: "complete" } : {}),
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: false,
    ...(modern ? { _meta: serverMeta() } : {})
  };
}

function selectLegacyProtocolVersion(requested) {
  return LEGACY_PROTOCOL_VERSIONS.includes(requested) ? requested : DEFAULT_LEGACY_PROTOCOL_VERSION;
}

function isModernRequest(message, transportProtocolVersion) {
  return transportProtocolVersion === MODERN_PROTOCOL_VERSION ||
    message?.params?._meta?.["io.modelcontextprotocol/protocolVersion"] === MODERN_PROTOCOL_VERSION ||
    message?.method === "server/discover";
}

export async function handleRpc(message, projectPath, options = {}) {
  if (!message || message.jsonrpc !== "2.0") {
    return { jsonrpc: "2.0", id: message?.id ?? null, error: { code: -32600, message: "Invalid Request" } };
  }

  const { id, method, params = {} } = message;
  if (method === "notifications/initialized") return null;

  const modern = isModernRequest(message, options.protocolVersion);

  try {
    if (method === "server/discover") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resultType: "complete",
          supportedVersions: [MODERN_PROTOCOL_VERSION],
          capabilities: SERVER_CAPABILITIES,
          instructions: SERVER_INSTRUCTIONS,
          ttlMs: 300000,
          cacheScope: "public",
          _meta: serverMeta()
        }
      };
    }
    if (method === "initialize") {
      const protocolVersion = selectLegacyProtocolVersion(params.protocolVersion);
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion,
          capabilities: SERVER_CAPABILITIES,
          serverInfo: SERVER_INFO,
          instructions: SERVER_INSTRUCTIONS
        }
      };
    }
    if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          ...(modern ? { resultType: "complete" } : {}),
          tools: listTools(),
          ...(modern ? { ttlMs: 300000, cacheScope: "public", _meta: serverMeta() } : {})
        }
      };
    }
    if (method === "tools/call") {
      const data = await callTool(params.name, params.arguments || {}, projectPath);
      return { jsonrpc: "2.0", id, result: toolResult(data, modern) };
    }
    return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: error instanceof Error ? error.message : String(error) }
    };
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

function writeJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...extraHeaders });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

export function createServer(options = {}) {
  const projectPath = options.projectPath || process.env.NOVEL_PROJECT_FILE;
  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://localhost");
    const pathname = requestUrl.pathname;

    res.setHeader("Access-Control-Allow-Origin", process.env.MCP_ALLOW_ORIGIN || "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization, content-type, accept, mcp-session-id, mcp-protocol-version, mcp-method, mcp-name"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    if (req.method === "GET" && pathname === "/health") {
      writeJson(res, 200, { ok: true, service: SERVER_INFO.name, version: SERVER_INFO.version });
      return;
    }
    if (req.method === "HEAD" && pathname === "/mcp") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", Allow: "POST, GET, HEAD, OPTIONS" }).end();
      return;
    }
    if (req.method === "GET" && pathname === "/mcp") {
      writeJson(
        res,
        405,
        { error: "SSE stream not enabled; use POST for MCP requests" },
        { Allow: "POST, HEAD, OPTIONS" }
      );
      return;
    }
    if (req.method === "DELETE" && pathname === "/mcp") {
      writeJson(res, 405, { error: "session deletion is not supported by this stateless server" }, { Allow: "POST, HEAD, OPTIONS" });
      return;
    }
    if (req.method !== "POST" || pathname !== "/mcp") {
      writeJson(res, 404, { error: "not found" });
      return;
    }

    try {
      const payload = await readJson(req);
      const protocolVersion = req.headers["mcp-protocol-version"];
      const rpcOptions = { protocolVersion: Array.isArray(protocolVersion) ? protocolVersion[0] : protocolVersion };
      const response = Array.isArray(payload)
        ? (await Promise.all(payload.map((message) => handleRpc(message, projectPath, rpcOptions)))).filter(Boolean)
        : await handleRpc(payload, projectPath, rpcOptions);

      if (response === null || (Array.isArray(response) && response.length === 0)) {
        res.writeHead(202).end();
        return;
      }
      writeJson(res, 200, response);
    } catch (error) {
      writeJson(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || "0.0.0.0";
  const server = createServer();
  server.listen(port, host, () => {
    console.log(`Novel Runtime MCP listening on http://${host}:${port}/mcp`);
  });
}
