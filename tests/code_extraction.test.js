import { describe, it, expect } from "vitest";
import { loadFunctions } from "./helpers.js";

const { extractCodeBlocks, looksLikeCode, formatErrorForRetry } = loadFunctions(
    "client/js/main.js",
    ["extractCodeBlocks", "looksLikeCode", "formatErrorForRetry"]
);

describe("extractCodeBlocks", () => {
    it("extracts a single javascript code block", () => {
        const text = "Here's the code:\n```javascript\nvar x = 1;\n$.writeln(x);\n```\nDone.";
        const blocks = extractCodeBlocks(text);
        expect(blocks).toHaveLength(1);
        expect(blocks[0]).toBe("var x = 1;\n$.writeln(x);");
    });

    it("extracts a code block with no language tag", () => {
        const text = "```\nvar x = 1;\n```";
        const blocks = extractCodeBlocks(text);
        expect(blocks).toHaveLength(1);
        expect(blocks[0]).toBe("var x = 1;");
    });

    it("extracts multiple code blocks", () => {
        const text = "First:\n```js\nvar a = 1;\n```\nSecond:\n```js\nvar b = 2;\n```";
        const blocks = extractCodeBlocks(text);
        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toBe("var a = 1;");
        expect(blocks[1]).toBe("var b = 2;");
    });

    it("returns empty array for text with no code", () => {
        const text = "This is just a description with no code.";
        const blocks = extractCodeBlocks(text);
        expect(blocks).toHaveLength(0);
    });

    it("handles unclosed code block", () => {
        const text = "```javascript\nvar x = 1;\nvar y = 2;";
        const blocks = extractCodeBlocks(text);
        expect(blocks).toHaveLength(1);
        expect(blocks[0]).toBe("var x = 1;\nvar y = 2;");
    });

    it("falls back to full text if it looks like code", () => {
        const text = "var comp = app.project.activeItem;\nvar layer = comp.layers.addText(\"Hello\");\n$.writeln(\"Done\");";
        const blocks = extractCodeBlocks(text);
        expect(blocks).toHaveLength(1);
        expect(blocks[0]).toBe(text);
    });

    it("preserves indentation inside code blocks", () => {
        const text = "```javascript\nfunction test() {\n    var x = 1;\n    return x;\n}\n```";
        const blocks = extractCodeBlocks(text);
        expect(blocks[0]).toContain("    var x = 1;");
    });

    it("handles empty code blocks", () => {
        const text = "```javascript\n```";
        const blocks = extractCodeBlocks(text);
        expect(blocks).toHaveLength(1);
        expect(blocks[0]).toBe("");
    });
});

describe("looksLikeCode", () => {
    it("detects ExtendScript code", () => {
        const text = "var comp = app.project.activeItem;\ncomp.layers.addText(\"Hello\");\n$.writeln(\"Done\");";
        expect(looksLikeCode(text)).toBe(true);
    });

    it("rejects plain English", () => {
        const text = "I think you should create a new composition and add some text to it.";
        expect(looksLikeCode(text)).toBe(false);
    });

    it("detects code with function definitions", () => {
        const text = "function createLayer() {\n    var layer = comp.layers.addNull();\n    return layer;\n}";
        expect(looksLikeCode(text)).toBe(true);
    });

    it("handles mixed content below threshold", () => {
        const text = "Here is what I'll do:\n- Create a composition\n- Add layers\n- Set keyframes\nvar x = 1;";
        expect(looksLikeCode(text)).toBe(false);
    });
});

describe("formatErrorForRetry", () => {
    it("formats code and error into retry prompt", () => {
        const code = "var x = undefined_var;";
        const error = "ReferenceError: undefined_var is not defined";
        const result = formatErrorForRetry(code, error);

        expect(result).toContain("```javascript");
        expect(result).toContain(code);
        expect(result).toContain(error);
        expect(result).toContain("fix the code");
    });
});
