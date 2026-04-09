# AI Assistant for After Effects

A CEP panel that lets you control Adobe After Effects using natural language. Describe what you want — the AI generates and executes ExtendScript code automatically.

Supports **Claude**, **OpenAI**, and **Ollama** (local).

## Features

- **Natural language control** — describe what you want, the AI generates ExtendScript and executes it
- **Auto-execution** — generated code runs directly in After Effects inside an undo group
- **Scene awareness** — the AI sees your current project state (compositions, layers, effects, keyframes)
- **Auto-retry with error hints** — if code fails, it sends the error back with targeted fix hints
- **Auto-undo on failure** — failed executions are rolled back so partial changes don't pile up
- **Code sanitizer** — auto-fixes common LLM mistakes (ES3 violations, dimension mismatches, etc.)
- **Rate limit handling** — automatic retry with backoff on API rate limits
- **Conversation history** — iterative refinement ("make it bigger", "change the color to red")
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

> Adjust `CSXS.11` to match your CEP version: `CSXS.12` for AE 2025, `CSXS.11` for AE 2022–2024, `CSXS.9`/`CSXS.10` for older versions.

#### 2. Deploy the extension

```bash
# Install dependencies and deploy to CEP extensions folder
npm install
npm run deploy
```

On macOS you can alternatively symlink:

```bash
ln -s /path/to/afx-slop ~/Library/Application\ Support/Adobe/CEP/extensions/afx-slop
```

> **Note:** Windows symlinks (`mklink /D`) are not recommended — CEP cannot load host scripts through them. Use `npm run deploy` instead, which copies the extension to the correct location. Re-run after making changes.

#### 3. Enable scripting in After Effects

Go to **Edit > Preferences > Scripting & Expressions** and enable:

- "Allow Scripts to Write Files and Access Network"

#### 4. Open the panel

Restart After Effects, then go to **Window > Extensions > AI Assistant**.

### Configure

Click the **Settings** header in the panel, select your LLM provider, and enter your API key.

## Usage

Type natural language prompts in the input field. Press **Enter** to send (Shift+Enter for newline).

### Example prompts

**Compositions and setup:**

- "Create a 10-second 1920x1080 composition at 30fps"
- "Duplicate the active comp and rename it to 'v2'"
- "Set the comp background to dark blue"

**Layers:**

- "Add a text layer that says 'Hello World' in white, centered"
- "Add a solid blue background layer behind everything"
- "Create a null object and parent all layers to it"
- "Add an adjustment layer with a Curves effect on top"

**Animation:**

- "Add a zoom-in animation to the text layer"
- "Fade in all layers over 1 second"
- "Add a bounce scale animation to layer 1"
- "Animate the text position from left to center with ease"
- "Add a wiggle expression to the position of the text layer"
- "Stagger the fade-in of all layers by 0.2 seconds"

**Effects and styling:**

- "Apply a Gaussian blur of 15px to the background"
- "Add a drop shadow to the text layer"
- "Set the text color to red and font size to 72"
- "Add a vignette using a dark solid with an elliptical mask"

**Project management:**

- "List all compositions in the project"
- "Rename layer 1 to 'Title'"
- "Lock all layers except the text layer"
- "Render the active comp to the desktop as a QuickTime file"

**Iterative refinement** — follow up with context from the conversation:

- "Make it bigger"
- "Change the color to red"
- "Make the animation slower"
- "Add the same effect to all other layers"

## Providers

| Provider           | Models                                  | API Key                                                 |
| ------------------ | --------------------------------------- | ------------------------------------------------------- |
| Claude (Anthropic) | Sonnet 4, Opus 4, Haiku 4               | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI             | GPT-4o, GPT-4o Mini, GPT-4.1            | [platform.openai.com](https://platform.openai.com/)     |
| Ollama (Local)     | Any model (qwen2.5-coder, llama3, etc.) | None (free, local)                                      |

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
npm run deploy       # copy extension to CEP extensions folder
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
