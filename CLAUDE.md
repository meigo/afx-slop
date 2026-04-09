# afx-slop — AI Assistant for After Effects

## Overview

CEP panel extension that enables natural language control of Adobe After Effects. Users describe what they want, an LLM generates ExtendScript code, and it executes directly in AE.

## Architecture

```
client/                  HTML/CSS/JS panel (runs in CEP's Chromium)
├── index.html           Main panel UI
├── css/styles.css       AE-matching dark theme
├── js/
│   ├── main.js          App logic: chat, settings, retry, code extraction
│   ├── llm_client.js    LLM API clients (Claude, OpenAI, Ollama)
│   └── ae_api_ref.js    System prompt with AE scripting API reference
└── lib/
    └── CSInterface.js   Adobe CEP bridge (shim — replace with official for production)

host/
└── index.jsx            ExtendScript: code execution, project state gathering

CSXS/
└── manifest.xml         CEP extension manifest
```

## Data flow

1. User types prompt in panel
2. Panel gathers AE project state via `csInterface.evalScript("getProjectState()")`
3. Builds system prompt (API reference + project state) and sends to LLM
4. LLM returns response with ```javascript code block
5. Panel extracts code and sends to AE via `csInterface.evalScript("executeCode(...)")`
6. AE executes inside undo group, captures $.writeln output
7. Result shown in panel; on error, auto-retries with error context

## Key conventions

- **ExtendScript is ES3** — no let/const, no arrow functions, no template literals, no for...of
- **Indices are 1-based** in AE scripting (layers, items, properties)
- **Colors are [R,G,B] with 0-1 range**, scale is percentage [100,100]
- **Time is in seconds** (float), not frames
- All code executes inside `app.beginUndoGroup()` / `app.endUndoGroup()`

## Settings

Stored in browser localStorage (`afx-slop-settings`). Includes provider, API keys, model selection, max retries, rich prompt toggle.

## Before committing

- Run `npm run lint` and `npm test` — fix any failures before committing
- When adding a larger feature, update the README to reflect the changes

## Testing / debugging

- `npm test` — 36 unit tests (code extraction, project state formatting, system prompt)
- `npm run lint` — ESLint with ES2020 rules for client JS, ES3 rules for ExtendScript
- Enable PlayerDebugMode for unsigned extensions
- Chrome DevTools at http://localhost:8088 (port from .debug file)
- ExtendScript debugging via VS Code ExtendScript Debugger extension
