const expoConfig = require('eslint-config-expo/flat');
const noRawTimeRender = require('./eslint-rules/no-raw-time-render');
const noLiteralString = require('./eslint-rules/no-literal-string');
const noInlineHex = require('./eslint-rules/no-inline-hex');
const noPhysicalDirection = require('./eslint-rules/no-physical-direction');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'ios/**',
      'android/**',
      // Edge Functions are Deno code; don't lint them with the RN/Expo config.
      'supabase/functions/**',
      // Web workspaces are Next.js / static; they ship their own configs.
      'tenant-landing/**',
      'marketing-site/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'ma3ady-rules': {
        rules: {
          'no-raw-time-render': noRawTimeRender,
          'no-literal-string': noLiteralString,
          'no-inline-hex': noInlineHex,
          'no-physical-direction': noPhysicalDirection,
        },
      },
    },
    rules: {
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
      'ma3ady-rules/no-inline-hex': 'error',
      'ma3ady-rules/no-physical-direction': 'error',
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
    // src/design/** owns the raw token values. Hex literals belong here only.
    files: ['src/design/**/*.{ts,tsx}'],
    rules: {
      'ma3ady-rules/no-inline-hex': 'off',
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
