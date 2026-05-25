module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh'],
  settings: { react: { version: '18.3' } },
  ignorePatterns: ['dist', 'node_modules', 'playwright-report', 'test-results', '.pnpm-store', 'src/services/feed/referenceMids.json'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
  },
  overrides: [
    {
      files: ['*.config.ts', '*.config.cjs', 'scripts/**/*.ts'],
      rules: { '@typescript-eslint/no-var-requires': 'off' },
    },
  ],
};
