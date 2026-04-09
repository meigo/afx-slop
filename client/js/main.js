/**
 * Main application logic for the AI Assistant CEP panel.
 * Manages chat, settings, code execution, and retry logic.
 */

// ─── State ─────────────────────────────────────────────────────────────────────

const csInterface = new CSInterface();

const state = {
    isBusy: false,
    conversationHistory: [],  // [{role, content}, ...]
    retryCount: 0,
    maxRetries: 3,
};

// ─── Settings ──────────────────────────────────────────────────────────────────

function getSettings() {
    return {
        provider: document.getElementById("provider").value,
        claudeApiKey: document.getElementById("claude-api-key").value,
        claudeModel: document.getElementById("claude-model").value,
        openaiApiKey: document.getElementById("openai-api-key").value,
        openaiModel: document.getElementById("openai-model").value,
        ollamaUrl: document.getElementById("ollama-url").value,
        ollamaModel: document.getElementById("ollama-model").value,
        maxRetries: parseInt(document.getElementById("max-retries").value) || 3,
        richPrompt: document.getElementById("rich-prompt").checked,
    };
}

function saveSettings() {
    const settings = getSettings();
    state.maxRetries = settings.maxRetries;
    localStorage.setItem("afx-slop-settings", JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem("afx-slop-settings");
    if (!saved) return;
    try {
        const s = JSON.parse(saved);
        if (s.provider) document.getElementById("provider").value = s.provider;
        if (s.claudeApiKey) document.getElementById("claude-api-key").value = s.claudeApiKey;
        if (s.claudeModel) document.getElementById("claude-model").value = s.claudeModel;
        if (s.openaiApiKey) document.getElementById("openai-api-key").value = s.openaiApiKey;
        if (s.openaiModel) document.getElementById("openai-model").value = s.openaiModel;
        if (s.ollamaUrl) document.getElementById("ollama-url").value = s.ollamaUrl;
        if (s.ollamaModel) document.getElementById("ollama-model").value = s.ollamaModel;
        if (s.maxRetries !== undefined) document.getElementById("max-retries").value = s.maxRetries;
        if (s.richPrompt !== undefined) document.getElementById("rich-prompt").checked = s.richPrompt;
        state.maxRetries = s.maxRetries || 3;
        onProviderChange();
    } catch (e) {
        console.error("Failed to load settings:", e);
    }
}

function onProviderChange() {
    const provider = document.getElementById("provider").value;
    document.getElementById("claude-settings").classList.toggle("hidden", provider !== "claude");
    document.getElementById("openai-settings").classList.toggle("hidden", provider !== "openai");
    document.getElementById("ollama-settings").classList.toggle("hidden", provider !== "ollama");
    saveSettings();
}

function toggleSettings() {
    const panel = document.getElementById("settings-panel");
    const arrow = document.getElementById("settings-arrow");
    panel.classList.toggle("hidden");
    arrow.classList.toggle("open");
}

// ─── Chat UI ───────────────────────────────────────────────────────────────────

function addMessage(role, content, cssClass) {
    const container = document.getElementById("chat-messages");

    // Remove welcome message if present
    const welcome = container.querySelector(".welcome-msg");
    if (welcome) welcome.remove();

    const div = document.createElement("div");
    div.className = "message " + (cssClass || role);

    const header = document.createElement("div");
    header.className = "message-header";

    if (role === "user") {
        header.className += " user-header";
        header.textContent = "You";
    } else if (cssClass === "error" || cssClass === "system error") {
        header.className += " error-header";
        header.textContent = "Error";
    } else if (role === "system") {
        header.textContent = "Result";
    } else if (role === "retry") {
        header.textContent = "Retry";
    }

    div.appendChild(header);

    const body = document.createElement("div");
    body.textContent = content;
    div.appendChild(body);

    container.appendChild(div);
    scrollToBottom();
}

function addCodeMessage(code) {
    const container = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = "message system";

    const header = document.createElement("div");
    header.className = "message-header";
    header.textContent = "Generated Code";
    div.appendChild(header);

    const pre = document.createElement("pre");
    pre.textContent = code;
    div.appendChild(pre);

    container.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById("chat-container");
    container.scrollTop = container.scrollHeight;
}

function setBusy(busy) {
    state.isBusy = busy;
    document.getElementById("busy-indicator").classList.toggle("hidden", !busy);
    document.getElementById("send-btn").disabled = busy;
    document.getElementById("prompt-input").disabled = busy;
}

function clearChat() {
    const container = document.getElementById("chat-messages");
    container.innerHTML = '<div class="welcome-msg"><p>AI Assistant for After Effects</p><p class="sub">Describe what you want to create or modify.</p></div>';
    state.conversationHistory = [];
    state.retryCount = 0;
    setBusy(false);
}

function clearHistory() {
    clearChat();
    localStorage.removeItem("afx-slop-history");
}

// ─── Code Extraction ───────────────────────────────────────────────────────────

function extractCodeBlocks(text) {
    var blocks = [];
    var lines = text.split("\n");
    var inBlock = false;
    var currentBlock = [];

    for (var i = 0; i < lines.length; i++) {
        var stripped = lines[i].trim();
        if (stripped.indexOf("```") === 0) {
            if (inBlock) {
                blocks.push(currentBlock.join("\n"));
                currentBlock = [];
                inBlock = false;
            } else {
                inBlock = true;
                // Skip language identifier
            }
            continue;
        }
        if (inBlock) {
            currentBlock.push(lines[i]);
        }
    }

    if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
    }

    // If no code blocks found, check if the entire response looks like code
    if (blocks.length === 0 && looksLikeCode(text)) {
        blocks.push(text);
    }

    return blocks;
}

function looksLikeCode(text) {
    var indicators = ["var ", "app.", "comp.", "layer.", "function ", "for (", "if (", "$.writeln"];
    var lines = text.trim().split("\n");
    var codeLines = 0;
    for (var i = 0; i < lines.length; i++) {
        for (var j = 0; j < indicators.length; j++) {
            if (lines[i].indexOf(indicators[j]) >= 0) {
                codeLines++;
                break;
            }
        }
    }
    return codeLines > lines.length * 0.3;
}

function formatErrorForRetry(code, error) {
    return "The following ExtendScript code produced an error:\n\n" +
        "```javascript\n" + code + "\n```\n\n" +
        "Error:\n```\n" + error + "\n```\n\n" +
        "Please fix the code. Respond only with the corrected ExtendScript code.";
}

// ─── ExtendScript Communication ────────────────────────────────────────────────

function evalScript(script) {
    return new Promise(function(resolve, reject) {
        csInterface.evalScript(script, function(result) {
            if (result === "EvalScript error.") {
                reject(new Error("ExtendScript evaluation error"));
            } else {
                resolve(result);
            }
        });
    });
}

async function getProjectState() {
    try {
        var result = await evalScript("getProjectState()");
        var parsed = JSON.parse(result);
        return formatProjectState(parsed);
    } catch (_e) {
        return "No project state available.";
    }
}

function formatProjectState(state) {
    if (state.error) return state.error;

    var parts = [];
    parts.push("Project: " + state.projectName);
    parts.push("Bit depth: " + state.bitsPerChannel + " bpc");
    parts.push("Items: " + state.numItems);

    if (state.compositions && state.compositions.length > 0) {
        parts.push("\nCompositions (" + state.compositions.length + "):");
        for (var i = 0; i < state.compositions.length; i++) {
            var c = state.compositions[i];
            parts.push("  - " + c.name + " (" + c.width + "x" + c.height +
                ", " + c.duration + "s, " + c.frameRate + "fps, " + c.numLayers + " layers)");
        }
    }

    if (state.activeComp) {
        var ac = state.activeComp;
        parts.push("\nActive comp: " + ac.name + " (" + ac.width + "x" + ac.height +
            ", " + ac.duration + "s, " + ac.frameRate + "fps)");
        parts.push("Work area: " + ac.workAreaStart + "s - " +
            (ac.workAreaStart + ac.workAreaDuration) + "s");
        parts.push("Background: [" + ac.bgColor.join(", ") + "]");

        if (ac.layers && ac.layers.length > 0) {
            parts.push("\nLayers (" + ac.numLayers + "):");
            for (var i = 0; i < ac.layers.length; i++) {
                parts.push(formatLayer(ac.layers[i]));
            }
            if (ac.layersTruncated) {
                parts.push("  ...and " + ac.layersTruncated + " more layers");
            }
        }
    }

    if (state.footage && state.footage.length > 0) {
        parts.push("\nFootage (" + state.footage.length + "):");
        for (var i = 0; i < Math.min(state.footage.length, 20); i++) {
            var f = state.footage[i];
            parts.push("  - " + f.name + (f.width ? " (" + f.width + "x" + f.height + ")" : "") +
                (f.duration ? ", " + f.duration + "s" : ""));
        }
    }

    if (state.renderQueue) {
        parts.push("\nRender queue: " + state.renderQueue.numItems + " items" +
            (state.renderQueue.rendering ? " (RENDERING)" : ""));
    }

    return parts.join("\n");
}

function formatLayer(l) {
    var info = "  " + l.index + ". " + l.name + " [" + l.type + "]";

    if (!l.enabled) info += " (disabled)";
    if (l.solo) info += " (solo)";
    if (l.locked) info += " (locked)";
    if (l.is3D) info += " (3D)";

    if (l.type === "text" && l.text) {
        var truncated = l.text.length > 40 ? l.text.substring(0, 40) + "..." : l.text;
        info += ' text="' + truncated + '"';
        if (l.fontSize) info += " size=" + l.fontSize;
    }

    if (l.type === "precomp" && l.sourceName) {
        info += " src=" + l.sourceName;
    }

    if (l.position) info += " pos=[" + l.position.join(",") + "]";
    if (l.scale && (l.scale[0] !== 100 || l.scale[1] !== 100)) {
        info += " scale=[" + l.scale.join(",") + "]";
    }
    if (l.rotation) info += " rot=" + l.rotation;
    if (l.opacity !== undefined && l.opacity !== 100) info += " opacity=" + l.opacity;
    if (l.parent) info += " parent=" + l.parent;

    if (l.effects && l.effects.length > 0) {
        var fxNames = l.effects.map(function(e) { return e.name; });
        info += " fx=[" + fxNames.join(", ") + "]";
    }

    if (l.maskCount) info += " masks=" + l.maskCount;
    if (l.keyframes) info += " kf={" + l.keyframes + "}";
    if (l.expressions) info += " expr={" + l.expressions + "}";

    return info;
}

// ─── Execute Code in AE ────────────────────────────────────────────────────────

async function executeInAE(code) {
    // Escape the code for passing through evalScript
    var escaped = code
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");

    try {
        var result = await evalScript('executeCode("' + escaped + '")');
        return JSON.parse(result);
    } catch (e) {
        return { success: false, output: "", error: "Panel error: " + e.message };
    }
}

// ─── Main Send Flow ────────────────────────────────────────────────────────────

async function sendMessage() {
    var input = document.getElementById("prompt-input");
    var promptText = input.value.trim();

    if (!promptText || state.isBusy) return;

    var settings = getSettings();

    // Validate API key
    if (settings.provider === "claude" && !settings.claudeApiKey) {
        addMessage("system", "Claude API key not set. Open Settings above.", "system error");
        return;
    }
    if (settings.provider === "openai" && !settings.openaiApiKey) {
        addMessage("system", "OpenAI API key not set. Open Settings above.", "system error");
        return;
    }

    // Add user message to UI
    addMessage("user", promptText);
    state.conversationHistory.push({ role: "user", content: promptText });

    // Clear input
    input.value = "";
    state.retryCount = 0;
    setBusy(true);

    await callLLMAndExecute(settings);
}

async function callLLMAndExecute(settings) {
    try {
        // Gather project state
        var sceneContext = await getProjectState();

        // Build system prompt
        var systemPrompt = buildSystemPrompt(sceneContext, settings.richPrompt);

        // Keep conversation trimmed (last 20 exchanges)
        var messages = state.conversationHistory.slice(-40);

        // Call LLM
        var response = await LLMClient.call(settings, systemPrompt, messages);

        // Add to history
        state.conversationHistory.push({ role: "assistant", content: response });

        // Extract code blocks
        var codeBlocks = extractCodeBlocks(response);

        if (codeBlocks.length > 0) {
            var code = codeBlocks.join("\n\n");

            // Execute in AE
            var result = await executeInAE(code);

            if (result.success) {
                var msg = "Executed successfully.";
                if (result.output && result.output.trim()) {
                    msg += "\n" + result.output;
                }
                addMessage("system", msg);
                state.conversationHistory.push({ role: "user", content: "[System: Code executed successfully. Output: " + (result.output || "none") + "]" });
                setBusy(false);
            } else {
                addMessage("system", "Execution error:\n" + result.error, "system error");
                state.conversationHistory.push({ role: "user", content: "[System: Code execution failed. Error: " + result.error + "]" });

                // Auto-retry
                if (state.retryCount < settings.maxRetries) {
                    await triggerRetry(settings, code, result.error);
                } else {
                    addMessage("system", "Failed after " + settings.maxRetries + " retries.", "system error");
                    setBusy(false);
                }
            }
        } else {
            // No code in response -- show the text response
            addMessage("system", response);
            setBusy(false);
        }
    } catch (e) {
        addMessage("system", "API Error: " + e.message, "system error");
        setBusy(false);
    }
}

async function triggerRetry(settings, failedCode, error) {
    state.retryCount++;
    addMessage("retry", "Retrying... (attempt " + state.retryCount + "/" + settings.maxRetries + ")", "retry");

    var retryPrompt = formatErrorForRetry(failedCode, error);
    state.conversationHistory.push({ role: "user", content: retryPrompt });

    await callLLMAndExecute(settings);
}

// ─── Input Handling ────────────────────────────────────────────────────────────

function handleKeyDown(event) {
    // Enter sends (Shift+Enter for newline)
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function() {
    loadSettings();
});
