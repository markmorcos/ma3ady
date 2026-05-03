const { RuleTester } = require('eslint');
const rule = require('../no-physical-direction');

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

ruleTester.run('no-physical-direction', rule, {
  valid: [
    { code: `const s = StyleSheet.create({ row: { marginStart: 8 } });` },
    { code: `<View style={{ paddingEnd: 12 }} />` },
    { code: `const x = { left: 0 };` }, // not in style context → allowed
  ],
  invalid: [
    {
      code: `const s = StyleSheet.create({ row: { marginLeft: 8 } });`,
      errors: [{ messageId: 'physical' }],
    },
    {
      code: `const s = StyleSheet.create({ row: { paddingRight: 12 } });`,
      errors: [{ messageId: 'physical' }],
    },
    {
      code: `<View style={{ left: 0 }} />`,
      errors: [{ messageId: 'physical' }],
    },
  ],
});
