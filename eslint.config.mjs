// @ts-check

// Direct imports for ESLint flat config components
import globals from "globals";
import eslint from "@eslint/js";

// Directly import the TypeScript ESLint parser and plugin
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

import pluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginN from "eslint-plugin-n";

export default [
  // ESLint's recommended base rules
  eslint.configs.recommended,

  // Node.js specific rules from eslint-plugin-n
  pluginN.configs["flat/recommended-script"], // Or 'flat/recommended' for ESM files

  // Configuration for TypeScript files
  {
    // Register the TypeScript ESLint plugin
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    // Configure language options for TypeScript files
    languageOptions: {
      globals: {
        ...globals.node,
      },
      // Use the TypeScript parser
      parser: tsParser,
      parserOptions: {
        // This tells the parser to use your tsconfig.json for type-checking
        project: true,
        // If your tsconfig.json is not in the root, specify the path:
        // project: './path/to/your/tsconfig.json',
        ecmaVersion: 2022, // Or your target ES version
        sourceType: "module",
      },
    },
    // Apply recommended TypeScript ESLint rules (type-aware)
    // Use tsPlugin.configs directly as they are now imported
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs["recommended-type-checked"].rules,

      // Your custom rules and overrides
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_(.+)" },
      ],
      "no-extra-semi": "off", // Often conflicts with Prettier
      "no-use-before-define": "off",
      "no-warning-comments": [
        "error",
        { terms: ["nocommit", "@nocommit", "@no-commit"] },
      ],
      "n/no-unsupported-features/es-syntax": [
        "error",
        { ignores: ["modules"] },
      ],

      // TypeScript-ESLint overrides or custom rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_(.+)",
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/explicit-module-boundary-types": ["error"],
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
    },
  },
  // Rules specific to JS files, disabling TypeScript-aware rules
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    // Disable specific type-checked rules for JS files that might be inherited
    ...tsPlugin.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: {
        project: undefined, // No 'project' for pure JS files
      },
      sourceType: "module",
    },
    rules: {
      // You might need to explicitly turn off some @typescript-eslint rules for JS files here
      // e.g., '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  // Prettier integration (must be last to ensure formatting rules override)
  pluginPrettierRecommended,
  // Ignored files (often from .gitignore)
  {
    ignores: ["**/dist/*", "/dist", "**/pkg/*", "**/docs/*", "**/generated/*"],
  },
  // Specific rule for ESLint config files themselves
  {
    files: ["eslint.config.*"],
    rules: {
      "n/no-unpublished-import": "off",
    },
  },
];
