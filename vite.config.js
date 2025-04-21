import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [tailwindcss()],
    build: {
        outDir: "dist",
        minify: "terser",
        terserOptions: {
            ecma: 6,
            compress: {
                arguments: true,
                booleans_as_integers: true,
                drop_console: true,
                hoist_funs: true,
                keep_fargs: false,
                passes: 3,
            },
            format: {
                comments: false,
            },
        },
    },
    server: {},
});
