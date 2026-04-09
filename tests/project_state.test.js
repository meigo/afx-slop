import { describe, it, expect } from "vitest";
import { loadFunctions } from "./helpers.js";

const { formatProjectState, formatLayer } = loadFunctions(
    "client/js/main.js",
    ["formatProjectState", "formatLayer"]
);

describe("formatProjectState", () => {
    it("formats a minimal project state", () => {
        const state = {
            projectName: "test.aep",
            bitsPerChannel: 8,
            numItems: 3,
            compositions: [],
            footage: [],
            folders: [],
            activeComp: null,
            renderQueue: { numItems: 0, rendering: false },
        };
        const result = formatProjectState(state);
        expect(result).toContain("Project: test.aep");
        expect(result).toContain("Bit depth: 8 bpc");
        expect(result).toContain("Items: 3");
        expect(result).toContain("Render queue: 0 items");
    });

    it("shows error message when present", () => {
        const state = { error: "No project open" };
        expect(formatProjectState(state)).toBe("No project open");
    });

    it("formats compositions list", () => {
        const state = {
            projectName: "test.aep",
            bitsPerChannel: 8,
            numItems: 1,
            compositions: [
                { name: "Main Comp", width: 1920, height: 1080, duration: 10, frameRate: 30, numLayers: 5 },
            ],
            footage: [],
            folders: [],
            activeComp: null,
            renderQueue: { numItems: 0, rendering: false },
        };
        const result = formatProjectState(state);
        expect(result).toContain("Compositions (1):");
        expect(result).toContain("Main Comp (1920x1080, 10s, 30fps, 5 layers)");
    });

    it("formats active comp with layers", () => {
        const state = {
            projectName: "test.aep",
            bitsPerChannel: 8,
            numItems: 1,
            compositions: [],
            footage: [],
            folders: [],
            activeComp: {
                name: "Active",
                width: 1920,
                height: 1080,
                duration: 5,
                frameRate: 24,
                workAreaStart: 0,
                workAreaDuration: 5,
                bgColor: [0, 0, 0],
                numLayers: 2,
                layers: [
                    { index: 1, name: "Text 1", type: "text", enabled: true, text: "Hello", fontSize: 72, position: [960, 540] },
                    { index: 2, name: "BG", type: "footage", enabled: true, position: [960, 540], scale: [100, 100] },
                ],
            },
            renderQueue: { numItems: 0, rendering: false },
        };
        const result = formatProjectState(state);
        expect(result).toContain("Active comp: Active");
        expect(result).toContain("Layers (2):");
        expect(result).toContain("Text 1 [text]");
        expect(result).toContain("BG [footage]");
    });

    it("shows rendering status", () => {
        const state = {
            projectName: "test.aep",
            bitsPerChannel: 8,
            numItems: 0,
            compositions: [],
            footage: [],
            folders: [],
            activeComp: null,
            renderQueue: { numItems: 2, rendering: true },
        };
        const result = formatProjectState(state);
        expect(result).toContain("2 items (RENDERING)");
    });
});

describe("formatLayer", () => {
    it("formats a basic layer", () => {
        const layer = { index: 1, name: "Solid", type: "footage", enabled: true };
        const result = formatLayer(layer);
        expect(result).toContain("1. Solid [footage]");
    });

    it("shows disabled state", () => {
        const layer = { index: 1, name: "Hidden", type: "null", enabled: false };
        expect(formatLayer(layer)).toContain("(disabled)");
    });

    it("shows text content truncated", () => {
        const layer = {
            index: 1, name: "Title", type: "text", enabled: true,
            text: "A".repeat(60), fontSize: 48,
        };
        const result = formatLayer(layer);
        expect(result).toContain('text="' + "A".repeat(40) + '..."');
        expect(result).toContain("size=48");
    });

    it("shows effects list", () => {
        const layer = {
            index: 1, name: "FX Layer", type: "footage", enabled: true,
            effects: [
                { name: "Gaussian Blur", matchName: "ADBE Gaussian Blur 2", enabled: true },
                { name: "Glow", matchName: "ADBE Glo2", enabled: true },
            ],
        };
        const result = formatLayer(layer);
        expect(result).toContain("fx=[Gaussian Blur, Glow]");
    });

    it("shows non-default scale", () => {
        const layer = {
            index: 1, name: "Scaled", type: "null", enabled: true,
            scale: [50, 50],
        };
        expect(formatLayer(layer)).toContain("scale=[50,50]");
    });

    it("omits default scale", () => {
        const layer = {
            index: 1, name: "Normal", type: "null", enabled: true,
            scale: [100, 100],
        };
        expect(formatLayer(layer)).not.toContain("scale=");
    });

    it("shows 3D flag", () => {
        const layer = { index: 1, name: "3D Layer", type: "footage", enabled: true, is3D: true };
        expect(formatLayer(layer)).toContain("(3D)");
    });

    it("shows keyframes and expressions", () => {
        const layer = {
            index: 1, name: "Animated", type: "null", enabled: true,
            keyframes: "Position:5, Scale:3",
            expressions: "Opacity",
        };
        const result = formatLayer(layer);
        expect(result).toContain("kf={Position:5, Scale:3}");
        expect(result).toContain("expr={Opacity}");
    });

    it("shows parent", () => {
        const layer = {
            index: 2, name: "Child", type: "null", enabled: true,
            parent: "Controller",
        };
        expect(formatLayer(layer)).toContain("parent=Controller");
    });

    it("shows precomp source", () => {
        const layer = {
            index: 1, name: "Pre-comp", type: "precomp", enabled: true,
            sourceName: "Inner Comp",
        };
        expect(formatLayer(layer)).toContain("src=Inner Comp");
    });
});
