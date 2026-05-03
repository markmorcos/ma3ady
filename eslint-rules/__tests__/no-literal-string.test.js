const { RuleTester } = require('eslint');
const rule = require('../no-literal-string');

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

ruleTester.run('no-literal-string', rule, {
  valid: [
    { code: `<Text>{t('common.cancel')}</Text>` },
    { code: `<Text>{count}</Text>` },
    { code: `<Text>OK</Text>` },
    { code: `<Text>14:00</Text>` },
    { code: `<Pressable accessibilityLabel={t('booking.cancelBooking')} />` },
    { code: `<Pressable accessibilityLabel="Save" />` }, // single word
  ],
  invalid: [
    {
      code: `<Text>Hello world</Text>`,
      errors: [{ messageId: 'child' }],
    },
    {
      code: `<Text>Welcome to ma3ady</Text>`,
      errors: [{ messageId: 'child' }],
    },
    {
      code: `<Pressable accessibilityLabel="Save changes" />`,
      errors: [{ messageId: 'a11y' }],
    },
    {
      code: `<Pressable accessibilityHint="This deletes the booking" />`,
      errors: [{ messageId: 'a11y' }],
    },
  ],
});
