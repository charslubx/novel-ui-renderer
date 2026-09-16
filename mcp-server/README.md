# Novel Runtime MCP (initial)

This directory contains a dependency-free HTTP MCP server intended for Gemini Spark custom apps and other MCP clients.

## What it provides

The first version intentionally stays read-only and small. It exposes:

- `get_story_context`
- `get_character`
- `get_character_knowledge`
- `get_open_loops`
- `check_repetition`
- `validate_novel_ui`

The service reads one JSON project file. By default it uses `mcp-server/data/default-project.json`. Set `NOVEL_PROJECT_FILE=/absolute/path/to/project.json` to use your own project state.

## Run locally

```bash
npm run mcp:start
```

Default endpoint:

```text
http://localhost:8787/mcp
```

Health check:

```text
http://localhost:8787/health
```

You can change the bind address with `HOST` and `PORT`.

## Quick protocol smoke test

```bash
curl -s http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```

List tools:

```bash
curl -s http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Call `get_character_knowledge`:

```bash
curl -s http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_character_knowledge","arguments":{"characterId":"sana"}}}'
```

## Gemini Spark

Spark needs a publicly reachable HTTPS endpoint. Do not enter a local filesystem path or `localhost` into the custom app field.

For development, expose the service through a secure tunnel and use the resulting URL ending in `/mcp`. For production, deploy the container behind HTTPS, for example:

```text
https://novel.example.com/mcp
```

The included GitHub Actions workflow publishes a container image to GHCR after changes reach `main`.

## Docker

Build:

```bash
docker build -f mcp-server/Dockerfile -t novel-runtime-mcp .
```

Run:

```bash
docker run --rm -p 8787:8787 \
  -v /path/to/project.json:/data/project.json:ro \
  -e NOVEL_PROJECT_FILE=/data/project.json \
  novel-runtime-mcp
```

## Current limits

This is an intentionally conservative first pass:

- read-only project state; no automatic mutation yet
- base Novel UI validation only; individual renderer prop schemas are not yet exported from the frontend package
- no authentication layer; put it behind an authenticated gateway before exposing private novel data
- no database yet; project state is loaded from JSON on every tool call

The next step should be extracting shared Novel UI schemas into a reusable core package, then adding authenticated project storage and explicit write tools with audit history.
