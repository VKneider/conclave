import slice from 'slicejs-cli/eslint-config.js';

export default [
  ...slice,
  // App-specific global (rendered by ToastProvider).
  { languageOptions: { globals: { ToastProvider: 'writable' } } }
];
