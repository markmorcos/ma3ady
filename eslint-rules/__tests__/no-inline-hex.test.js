const { RuleTester } = require('eslint');
const rule = require('../no-inline-hex');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-inline-hex', rule, {
  valid: [
    { code: `const c = theme.colors.brand[500];` },
    { code: `const c = useTheme().colors.text;` },
    { code: "const x = '#hello';" }, // not a real hex
    { code: "const word = '#hashtag';" },
  ],
  invalid: [
    {
      code: "const c = '#0F766E';",
      errors: [{ messageId: 'hex' }],
    },
    {
      code: "const c = '#fff';",
      errors: [{ messageId: 'hex' }],
    },
    {
      code: "const c = `#0F766E${alpha}`;",
      errors: [{ messageId: 'hex' }],
    },
    {
      code: "const c = '#0F766E10';",
      errors: [{ messageId: 'hex' }],
    },
  ],
});
