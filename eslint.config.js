import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        slice: 'readonly',
        Slice: 'readonly',
        ToastProvider: 'writable',
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-console': 'off',
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-constant-binary-expression': 'warn',
      'no-duplicate-imports': 'warn',
      'no-self-compare': 'warn',
      'no-template-curly-in-string': 'warn',
      'no-unmodified-loop-condition': 'warn',
      'no-unreachable-loop': 'warn',
      'no-unused-private-class-members': 'warn',
      'require-atomic-updates': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'test-results/',
      'src/libs/',
      'src/slice-events.generated.js',
    ],
  },
  {
    files: ['**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        page: 'readonly',
        browser: 'readonly',
      },
    },
  },
];
