const { join } = require("path");

module.exports = {
  root: true,
  env: { node: true, browser: true },
  extends: ["prettier", "plugin:@typescript-eslint/eslint-recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: [join(__dirname, "./tsconfig.json")],
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
};
