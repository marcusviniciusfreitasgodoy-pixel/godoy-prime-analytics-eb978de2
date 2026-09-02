import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // O projeto roda com strict: false / noImplicitAny: false, então `any` explícito
      // fica como aviso (visível, não bloqueia o CI). Endurecer quando a tipagem evoluir.
      "@typescript-eslint/no-explicit-any": "warn",
      // Permite `let x;` lido em closure antes da atribuição (ex.: timers cancelados em callbacks).
      "prefer-const": ["error", { ignoreReadBeforeAssign: true }],
    },
  },
);
