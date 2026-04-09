# AI Assistant for After Effects

A CEP panel that lets you control Adobe After Effects using natural language. Describe what you want — the AI generates and executes ExtendScript code automatically.

Supports **Claude**, **OpenAI**, and **Ollama** (local).

## Features

- **Natural language control** — "create a cinematic title card", "add a fade in to all layers", "set up a lower third"
- **Auto-execution** — generated ExtendScript runs directly in After Effects
- **Scene awareness** — the AI sees your current project state (compositions, layers, effects, keyframes)
- **Auto-retry** — if code fails, it sends the error back to the AI for automatic correction
- **Conversation history** — iterative refinement ("make it bigger", "change the color to red", "add a bounce")
- **Dark theme** — matches After Effects UI

## Installation

### Option A: Install from ZXP (recommended)

1. Download the latest `afx-slop.zxp` from [Releases](#)
2. Install using [ZXPInstaller](https://aescripts.com/learn/zxp-installer/) or [Anastasiy's Extension Manager](https://install.anastasiy.com/)
3. Restart After Effects
4. Go to **Window > Extensions > AI Assistant**

### Option B: Install from source (development)

#### 1. Enable unsigned extensions

```bash
# macOS
defaults write com.adobe.CSXS.11 PlayerDebugMode 1

# Windows (Command Prompt as Administrator)
reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f
```

> Adjust `CSXS.11` to match your CEP version (e.g., `CSXS.9` for older AE versions).

#### 2. Symlink the extension

```bash
# macOS
ln -s /path/to/afx-slop ~/Library/Application\ Support/Adobe/CEP/extensions/afx-slop

# Windows (Command Prompt as Administrator)
mklink /D "%APPDATA%\Adobe\CEP\extensions\afx-slop" "C:\path\to\afx-slop"
```

#### 3. Enable scripting in After Effects

Go to **Edit > Preferences > Scripting & Expressions** and enable:
- "Allow Scripts to Write Files and Access Network"

#### 4. Open the panel

Restart After Effects, then go to **Window > Extensions > AI Assistant**.

### Configure

Click the **Settings** header in the panel, select your LLM provider, and enter your API key.

## Usage

Type natural language prompts in the input field:

- "Create a 10-second 1080p composition"
- "Add a text layer that says 'Hello World' with a bounce animation"
- "Apply a Gaussian blur of 20px to the selected layer"
- "Create a lower third with my name"
- "Add a fade in and fade out to all layers"
- "Set up a particle background using shape layers"
- "Make a kinetic typography animation with the words 'Motion Design'"
- "Add a wiggle expression to the position of layer 1"
- "Render the active comp to the desktop as a QuickTime file"

Press **Enter** to send (Shift+Enter for newline).

## Providers

| Provider | Models | API Key |
|----------|--------|---------|
| Claude (Anthropic) | Sonnet 4, Opus 4, Haiku 4 | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4.1 | [platform.openai.com](https://platform.openai.com/) |
| Ollama (Local) | Any model (qwen2.5-coder, llama3, etc.) | None (free, local) |

## Building a ZXP for distribution

```bash
# One-time: install the signing tool
npm install -g zxp-sign-cmd

# Build (first run creates a self-signed certificate interactively)
./scripts/build-zxp.sh

# Force a new certificate
./scripts/build-zxp.sh --new-cert
```

Output: `build/afx-slop.zxp`

The certificate is stored in `.certs/` (gitignored). Keep your certificate password safe for future builds.

## Development

```bash
npm install          # install dev dependencies
npm test             # run tests (36 tests across 3 suites)
npm run test:watch   # run tests in watch mode
npm run lint         # lint client JS + ExtendScript
npm run lint:fix     # auto-fix lint issues
```

ESLint is configured with two rulesets:
- **`client/js/`** — modern JS (ES2020) for the CEP Chromium environment
- **`host/`** — ES3 for ExtendScript (catches accidental use of `let`, arrow functions, template literals, etc.)

## Debugging

With the `.debug` file in place and `PlayerDebugMode` enabled, open Chrome DevTools at:

```
http://localhost:8088
```

## Requirements

- Adobe After Effects CC 2020 or later (macOS or Windows)
- An API key for your chosen LLM provider (or Ollama running locally)

## License

MIT
