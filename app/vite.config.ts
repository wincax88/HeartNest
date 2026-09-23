import { defineConfig } from "vite";
import uniModule from "@dcloudio/vite-plugin-uni";

// The uni plugin is CommonJS; Node exposes its callable default one level deeper
// when this project is loaded as an ES module.
const uni = ((uniModule as unknown as { default?: typeof uniModule }).default ?? uniModule) as typeof uniModule;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
});
