const expoConfig = require('eslint-config-expo/flat');
const noRawTimeRender = require('./eslint-rules/no-raw-time-render');
const noLiteralString = require('./eslint-rules/no-literal-string');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**', 'ios/**', 'android/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'ma3ady-rules': {
        rules: {
          'no-raw-time-render': noRawTimeRender,
          'no-literal-string': noLiteralString,
        },
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}){1,2}$/]",
          message:
            'Inline hex colors are not allowed. Import a token from src/design instead.',
        },
        {
          selector: "TemplateElement[value.raw=/#([0-9a-fA-F]{3}){1,2}/]",
          message:
            'Inline hex colors are not allowed. Import a token from src/design instead.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*', '../../../*'],
              message:
                'Avoid deep relative imports. Use the @/ alias for paths inside src/.',
            },
          ],
        },
      ],
      'ma3ady-rules/no-raw-time-render': 'error',
    },
  },
  {
    // Per spec: the no-literal-string rule applies to user-visible component code
    // under src/components/ and app/. Scripts, hooks, services etc. don't render UI.
    files: ['src/components/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'ma3ady-rules/no-literal-string': 'error',
    },
  },
  {
    // Dev-tools surfaces are developer-only and intentionally English-only.
    files: ['app/dev/**/*.{ts,tsx}'],
    rules: {
      'ma3ady-rules/no-literal-string': 'off',
    },
  },
  {
    files: ['src/design/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Time.tsx and DateRange.tsx ARE the canonical timestamp renderers — they call
    // date-fns-tz format() internally. The rule scopes them out so it doesn't flag
    // its own implementation.
    files: ['src/components/Time.tsx', 'src/components/DateRange.tsx'],
    rules: {
      'ma3ady-rules/no-raw-time-render': 'off',
    },
  },
];
