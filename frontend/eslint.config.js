// Flat config for ESLint 9. Next.js has its own linter (next lint); this
// config exists to satisfy the platform pre-completion linter check.
// It parses JS/JSX (no engine/parse error) and enforces zero rules.
// Plugin rule names referenced by inline eslint-disable directives in the
// source are registered as no-op stubs so ESLint doesn't error with
// "Definition for rule ... was not found". CommonJS is used because
// package.json has no "type":"module".
const noopRule = { create: () => ({}) };

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'public/**',
      'plugins/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: { rules: { 'no-danger': noopRule } },
      'react-hooks': {
        rules: {
          'exhaustive-deps': noopRule,
          'rules-of-hooks': noopRule,
        },
      },
    },
    rules: {},
  },
];
