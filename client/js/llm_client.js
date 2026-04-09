/**
 * LLM API clients for Claude, OpenAI, and Ollama.
 * Makes direct HTTP calls from the CEP panel (which has full network access).
 */

const LLMClient = {

    /**
     * Call Claude (Anthropic) API.
     * @param {string} apiKey
     * @param {string} model
     * @param {string} systemPrompt
     * @param {Array} messages - [{role, content}, ...]
     * @returns {Promise<string>} assistant response text
     */
    async callClaude(apiKey, model, systemPrompt, messages) {
        const body = {
            model: model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: messages,
        };

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Claude API error ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        for (const block of (data.content || [])) {
            if (block.type === "text") return block.text;
        }
        return "";
    },

    /**
     * Call OpenAI API.
     */
    async callOpenAI(apiKey, model, systemPrompt, messages) {
        const allMessages = [
            { role: "system", content: systemPrompt },
            ...messages,
        ];

        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: allMessages,
                max_tokens: 4096,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        const choices = data.choices || [];
        return choices.length > 0 ? (choices[0].message?.content || "") : "";
    },

    /**
     * Call Ollama local API.
     */
    async callOllama(urlBase, model, systemPrompt, messages) {
        const url = urlBase.replace(/\/+$/, "") + "/api/chat";
        const allMessages = [
            { role: "system", content: systemPrompt },
            ...messages,
        ];

        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: allMessages,
                stream: false,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Ollama error ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        return data.message?.content || "";
    },

    /**
     * Dispatch to the correct provider.
     */
    async call(settings, systemPrompt, messages) {
        switch (settings.provider) {
            case "claude":
                return this.callClaude(settings.claudeApiKey, settings.claudeModel, systemPrompt, messages);
            case "openai":
                return this.callOpenAI(settings.openaiApiKey, settings.openaiModel, systemPrompt, messages);
            case "ollama":
                return this.callOllama(settings.ollamaUrl, settings.ollamaModel, systemPrompt, messages);
            default:
                throw new Error("Unknown provider: " + settings.provider);
        }
    },
};
