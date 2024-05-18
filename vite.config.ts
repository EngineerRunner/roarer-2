import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
      },
    }),
    topLevelAwait(),
  ],
  base: "/roarer-2",
});
