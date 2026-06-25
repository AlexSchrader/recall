module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.3' } },
  rules: {
    'react/prop-types': 'off',
    // Allow the `const { secret: _, ...safe } = obj` omit-idiom and intentionally
    // ignored args/catch bindings prefixed with `_`.
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['node_modules/', 'client/dist/', 'server/data/'],
};
