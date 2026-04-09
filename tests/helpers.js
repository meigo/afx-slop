import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Load functions from a browser-style script file (no module exports).
 * Evaluates the file in a sandboxed context and extracts named functions.
 *
 * @param {string} filePath - relative to project root
 * @param {string[]} functionNames - names of functions to extract
 * @returns {Object} map of function names to functions
 */
export function loadFunctions(filePath, functionNames) {
    const fullPath = resolve(process.cwd(), filePath);
    const code = readFileSync(fullPath, "utf-8");

    // Create a sandbox with minimal globals and DOM stubs
    const sandbox = {
        console,
        JSON,
        Math,
        parseInt,
        parseFloat,
        String,
        Array,
        Object,
        Error,
        RegExp,
        Promise,
        fetch: undefined,
        document: {
            addEventListener: function() {},
            getElementById: function() { return { value: "", classList: { toggle: function() {} } }; },
            createElement: function() { return { className: "", appendChild: function() {}, textContent: "" }; },
        },
        window: {},
        localStorage: { getItem: function() { return null; }, setItem: function() {} },
        CSInterface: function() { this.evalScript = function() {}; },
    };

    // Execute in sandbox
    const fn = new Function(...Object.keys(sandbox), code + "\n return { " + functionNames.join(", ") + " };");
    const result = fn(...Object.values(sandbox));

    return result;
}
