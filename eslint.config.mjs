import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "eslint-plugin-next";

const eslintConfig = defineConfig([
  // Note: This is a simplified config. Add back `nextVitals` and `nextTs` if needed.
  {
    plugins: {
      next: nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
