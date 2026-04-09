import js from "@eslint/js";

export default [
    // Client-side JS (modern, runs in CEP's Chromium)
    {
        files: ["client/js/**/*.js"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "script",
            globals: {
                // Browser globals
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                console: "readonly",
                fetch: "readonly",
                Promise: "readonly",
                JSON: "readonly",
                // CEP globals
                CSInterface: "readonly",
                SystemPath: "readonly",
                // Our modules (loaded via script tags)
                LLMClient: "readonly",
                buildSystemPrompt: "readonly",
                SYSTEM_PROMPT_BASE: "readonly",
                SYSTEM_PROMPT_RICH: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "error",
            "no-console": "off",
            "eqeqeq": ["error", "always"],
            "no-var": "off", // allow var for consistency with ExtendScript style
        },
    },

    // ExtendScript (ES3 — runs in After Effects)
    {
        files: ["host/**/*.jsx"],
        ...js.configs.recommended,
        languageOptions: {
            ecmaVersion: 3,
            sourceType: "script",
            globals: {
                // ExtendScript globals
                "$": "readonly",
                "app": "readonly",
                "File": "readonly",
                "Folder": "readonly",
                "JSON": "readonly",
                "CompItem": "readonly",
                "FootageItem": "readonly",
                "FolderItem": "readonly",
                "TextLayer": "readonly",
                "ShapeLayer": "readonly",
                "CameraLayer": "readonly",
                "LightLayer": "readonly",
                "AVLayer": "readonly",
                "ImportOptions": "readonly",
                "ImportAsType": "readonly",
                "KeyframeEase": "readonly",
                "KeyframeInterpolationType": "readonly",
                "Shape": "readonly",
                "MaskMode": "readonly",
                "BlendingMode": "readonly",
                "TrackMatteType": "readonly",
                "ParagraphJustification": "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "error",
            "eqeqeq": "off", // ES3 patterns often use ==
            "no-var": "off",
            // Catch modern syntax that will break in ExtendScript
            "no-const-assign": "error",
        },
    },

    // Ignore non-source files
    {
        ignores: ["node_modules/", "build/", "client/lib/", "tests/"],
    },
];
