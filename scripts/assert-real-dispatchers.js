#!/usr/bin/env node
const REQUIRED = [
  'EXPO_PUBLIC_EMAIL_DISPATCHER',
  'EXPO_PUBLIC_WHATSAPP_DISPATCHER',
  'EXPO_PUBLIC_PUSH_DISPATCHER',
];

const offending = REQUIRED.filter((name) => process.env[name] !== 'real');

if (offending.length > 0) {
  console.error(
    `[assert-real-dispatchers] production builds require ${offending.join(', ')} to be "real"`,
  );
  process.exit(1);
}
