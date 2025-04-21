import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default defineConfig([
    {
        ignores: ["dist/", "lib.old/", "**/*.old.*", "**/*.yaml"],
    },
    {
        files: ["**/*.{js,mjs,cjs}"],
        plugins: { js, import: importPlugin },
        extends: ["js/recommended"],
        rules: {
            "import/order": [
                "warn",
                {
                    groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
                    "newlines-between": "always",
                    alphabetize: {
                        order: "asc",
                        caseInsensitive: true,
                    },
                },
            ],
        },
    },
    {
        files: ["**/*.{js,mjs,cjs}"],
        languageOptions: { globals: globals.browser },
    },
    eslintConfigPrettier,
]);
