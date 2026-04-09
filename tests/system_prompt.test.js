import { describe, it, expect } from "vitest";
import { loadFunctions } from "./helpers.js";

const { buildSystemPrompt } = loadFunctions(
    "client/js/ae_api_ref.js",
    ["buildSystemPrompt"]
);

describe("buildSystemPrompt", () => {
    it("returns base prompt without scene context", () => {
        const prompt = buildSystemPrompt("", true);
        expect(prompt).toContain("ExtendScript");
        expect(prompt).toContain("app.project");
        expect(prompt).toContain("$.writeln");
        expect(prompt).not.toContain("Current project state");
    });

    it("includes scene context when provided", () => {
        const context = "Project: test.aep\nCompositions: Main Comp";
        const prompt = buildSystemPrompt(context, true);
        expect(prompt).toContain("Current project state");
        expect(prompt).toContain("test.aep");
        expect(prompt).toContain("Main Comp");
    });

    it("includes rich prompt when enabled", () => {
        const prompt = buildSystemPrompt("", true);
        expect(prompt).toContain("Spatial interpolation");
        expect(prompt).toContain("BlendingMode");
        expect(prompt).toContain("Text animators");
    });

    it("excludes rich prompt when disabled", () => {
        const prompt = buildSystemPrompt("", false);
        expect(prompt).toContain("ExtendScript");
        expect(prompt).not.toContain("Spatial interpolation");
    });

    it("includes cross-platform file path guidance", () => {
        const prompt = buildSystemPrompt("", true);
        expect(prompt).toContain("Folder.desktop");
        expect(prompt).toContain("Cross-platform");
    });

    it("includes ES3 warnings", () => {
        const prompt = buildSystemPrompt("", true);
        expect(prompt).toContain("No let/const");
        expect(prompt).toContain("no arrow functions");
    });

    it("includes shape match names", () => {
        const prompt = buildSystemPrompt("", true);
        expect(prompt).toContain("ADBE Vector Group");
        expect(prompt).toContain("ADBE Vector Shape - Rect");
    });

    it("includes common effect match names", () => {
        const prompt = buildSystemPrompt("", true);
        expect(prompt).toContain("ADBE Gaussian Blur 2");
        expect(prompt).toContain("ADBE Fractal Noise");
        expect(prompt).toContain("CC Particle World");
    });
});
