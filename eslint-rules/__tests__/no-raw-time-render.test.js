const { RuleTester } = require('eslint');
const rule = require('../no-raw-time-render');

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

ruleTester.run('no-raw-time-render', rule, {
  valid: [
    {
      code: `<Time value={appointment.starts_at} context="admin" />`,
    },
    {
      code: `<Text>{appointment.notes}</Text>`,
    },
    {
      code: `<Text>{customer.name}</Text>`,
    },
    {
      code: `<DateRange start={appt.starts_at} end={appt.ends_at} context="admin" />`,
    },
  ],
  invalid: [
    {
      code: `<Text>{appointment.starts_at}</Text>`,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: `<Text>{date.toLocaleString('en')}</Text>`,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: `<Text>{format(date, 'HH:mm')}</Text>`,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: `<Text>{formatInTimeZone(date, 'UTC', 'HH:mm')}</Text>`,
      errors: [{ messageId: 'raw' }],
    },
    {
      code: `<Text>{appt.created_at}</Text>`,
      errors: [{ messageId: 'raw' }],
    },
  ],
});
