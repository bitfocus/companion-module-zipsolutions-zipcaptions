// @ts-check // You can optionally remove this line as it's for TypeScript type checking

// Import the necessary modules
import globals from "globals"; // For Node.js globals
import eslint from "@eslint/js"; // For ESLint's recommended rules
import pluginPrettierRecommended from "eslint-plugin-prettier/recommended"; // For Prettier integration
import pluginN from "eslint-plugin-n"; // For Node.js-specific rules

export default [
  // ESLint's recommended base rules for general JavaScript
  eslint.configs.recommended,

  // Node.js specific rules from eslint-plugin-n
  // Use 'flat/recommended-module' for ES Modules (which your index.js now is)
  pluginN.configs["flat/recommended-module"],

  // Main configuration for all JavaScript files (.js, .mjs)
  {
    files: ["**/*.js", "**/*.mjs"], // Target all standard JS and ES Module files
    languageOptions: {
      globals: {
        ...globals.node, // Exposes Node.js global variables (like `process`, `module`, etc.)
      },
      // No specific parser needed for plain JavaScript; ESLint's default parser works
      parserOptions: {
        ecmaVersion: 2022, // Allows modern JavaScript syntax (e.g., async/await, optional chaining)
        sourceType: "module", // Crucial: Tells ESLint to parse these files as ES Modules (using `import`/`export`)
      },
    },
    // Rules that apply to all your JavaScript files
    rules: {
      // Prettier formatting rule (ensure your code matches Prettier's style)
      "prettier/prettier": "error",

      // Basic ESLint rules
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

      // Node.js-specific rules from eslint-plugin-n
      "n/no-unsupported-features/es-syntax": [
        "error",
        { ignores: ["modules"] },
      ],
      // If you had `require()` calls and want to allow them despite `sourceType: 'module'`,
      // you would need to disable specific rules, but typically you'd convert to `import`.
      // e.g., 'n/no-unpublished-require': 'off'
    },
  },

  // Prettier integration (must be last to ensure formatting rules override other ESLint rules)
  pluginPrettierRecommended,

  // Ignored files (often matches your .gitignore)
  {
    ignores: ["**/dist/*", "/dist", "**/pkg/*", "**/docs/*", "**/generated/*"],
  },
  // Specific rule for ESLint config files themselves (as they often import devDependencies)
  {
    files: ["eslint.config.*"],
    rules: {
      "n/no-unpublished-import": "off",
    },
  },
];
