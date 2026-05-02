const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**', 'ios/**', 'android/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
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
    },
  },
];
