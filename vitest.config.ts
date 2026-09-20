import {
    fileURLToPath,
    URL,
} from "node:url";

import {
    defineConfig,
} from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(
                new URL(
                    "./src",
                    import.meta.url,
                ),
            ),
        },
    },

    test: {
        environment: "node",

        include: [
            "tests/**/*.test.ts",
        ],

        coverage: {
            provider: "v8",

            reporter: [
                "text",
                "html",
                "json-summary",
            ],

            include: [
                "src/**/*.ts",
            ],

            exclude: [
                "src/**/*.model.ts",
                "src/**/*.types.ts",
                "src/**/*.dto.ts",
                "src/**/*.keys.ts",
            ],

            thresholds: {
                statements: 75,
                branches: 65,
                functions: 75,
                lines: 75,
            },
        },
    },
});