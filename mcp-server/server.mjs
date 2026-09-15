import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const DEFAULT_PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "novel-runtime-mcp", version: "0.1.0" };
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

function toolResult(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data
  };
}

export async function handleRpc(message, projectPath) {
  if (!message || message.jsonrpc !== "2.0") {
    return { jsonrpc: "2.0", id: message?.id ?? null, error: { code: -32600, message: "Invalid Request" } };
  }

  const { id, method, params = {} } = message;
  if (method === "notifications/initialized") return null;

  try {
    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: typeof params.protocolVersion === "string" ? params.protocolVersion : DEFAULT_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO
        }
      };
    }
    if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
    if (method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: listTools() } };
    if (method === "tools/call") {
      const data = await callTool(params.name, params.arguments || {}, projectPath);
      return { jsonrpc: "2.0", id, result: toolResult(data) };
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

export function createServer(options = {}) {
  const projectPath = options.projectPath || process.env.NOVEL_PROJECT_FILE;
  return http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.MCP_ALLOW_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: SERVER_INFO.name, version: SERVER_INFO.version }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/mcp") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    try {
      const payload = await readJson(req);
      const response = Array.isArray(payload)
        ? (await Promise.all(payload.map((message) => handleRpc(message, projectPath)))).filter(Boolean)
        : await handleRpc(payload, projectPath);

      if (response === null || (Array.isArray(response) && response.length === 0)) {
        res.writeHead(202).end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }));
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
