const typescriptEslint = require("typescript-eslint");

module.exports = [
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    files: ["src/**/*service.ts", "src/**/*routes.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ThrowStatement > NewExpression[callee.name='Error']",
          message: "Throw an AppError subclass instead of a raw Error.",
        },
      ],
    },
  },
  {
    files: ["src/**/repository.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["express", "node:http"],
          patterns: ["**/shared/router"],
        },
      ],
    },
  },
];