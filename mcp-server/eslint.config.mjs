/**
 * ESLint config for session-search-mcp
 * Disables rules from parent project that don't apply here
 */

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    rules: {
      'notice/notice': 'off',
    },
  },
];
