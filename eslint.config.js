const expoConfig = require('eslint-config-expo/flat');
const noRawTimeRender = require('./eslint-rules/no-raw-time-render');

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
