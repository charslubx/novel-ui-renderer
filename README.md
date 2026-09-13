# Novel UI Renderer

Tampermonkey / Userscript runtime that finds `:::novel-ui ... :::` data in AI responses and renders isolated story UI in place. Version 0.1 supports ChatGPT, includes a preliminary Gemini adapter, and ships five renderers. It does not call any model API.

## Install and build

```bash
npm install
npm test
npm run build
```

Open Tampermonkey, create a userscript, and replace its contents with `dist/novel-ui-renderer.user.js`. Enable the script and refresh ChatGPT or Gemini.

For development, run `npm run dev`. Set `localStorage["novel-ui-debug"] = "true"` in the target page console and refresh to enable debug logging and source disclosure controls.

## Test prompt

Ask the model to output the following exactly (without wrapping it in a Markdown code fence):

```text
请在回答中严格输出以下 Novel UI Schema：
:::novel-ui
{"schema":"novel-ui","version":"1.0","component":"chat","variant":"kakao","props":{"title":"凑崎纱夏","date":"2026-09-13","messages":[{"id":"1","sender":"sana","name":"凑崎纱夏","side":"left","text":"你在哪里？","time":"23:41","read":null},{"id":"2","sender":"yihyun","name":"徐以炫","side":"right","text":"医院。","time":"23:43","read":1}]}}
:::
```

## Architecture

- `adapters`: all website-specific selectors and observation logic.
- `parser`: marker extraction, JSON parsing, and base-schema validation.
- `core`: debounced runtime, logging, and renderer registry.
- `renderers`: component validation and safe DOM creation with `textContent`.
- `styles`: CSS bundled into each renderer's Shadow DOM.

Built-in renderer keys:

- `chat:kakao`
- `document:medical`
- `social:x-post`
- `social:x-feed`
- `social:x-notifications`
- `social:x-trends`
- `article:theqoo`
- `social:weibo-post`
- `ticket:flight`
- `ticket:ferry`
- `ticket:rail`
- `ticket:bus`
- `document:identity-card`
- `document:work-card`

Transport tickets share one validated schema and vary labels by transport type. Use `operator`, `operatorCode`, and the predefined `theme` values (`blue`, `red`, `green`, or `gold`) to represent fictional operators without copying a real company's protected visual identity. Identity and work cards intentionally use a default silhouette and visible fictional-document markings.

Incomplete streaming blocks are ignored until the closing marker arrives. Invalid JSON and invalid schemas remain visible. Successfully rendered source data stays in the DOM but is hidden. A `WeakSet` and `data-novel-ui-rendered` protect against repeat rendering.

## Add a renderer

1. Create a renderer under `src/renderers/<component>/<variant>.ts`.
2. Implement `NovelUIRenderer`, including strict `validate`, `render`, and Shadow DOM CSS.
3. Register it in `src/main.ts`.
4. Add focused validation and rendering tests.

Keep generated values out of `innerHTML`; create elements and assign `textContent`. Parser, adapters, registry, renderers, and styles are deliberately independent so a future Manifest V3 entry layer can reuse them.
