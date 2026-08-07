import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    build: {
        outDir: "dist",
    },
    plugins: [tailwindcss()],
    publicDir: false,
    resolve: {
        tsconfigPaths: true,
    },
});
