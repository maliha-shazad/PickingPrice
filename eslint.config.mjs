import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig([
  globalIgnores(["server/public/**", ".postgres/**", ".pnpm-store/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      // Express recognises an error handler by its four parameters, so `_next` stays even though it is unused.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // `catch {}` deliberately ignores a step that may already have been done (an existing column, a closed socket).
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      // These files are vendored verbatim from shadcn; the stricter rules apply to the site's own code.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);
