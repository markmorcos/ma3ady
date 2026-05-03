// Mocks here run before each test file. Add a `jest.mock(...)` block when a
// dependency that isn't easy to call from a test environment lands in the app.

// Stub the public Supabase env vars so `src/services/api/supabase.ts` doesn't
// throw at import time. Tests that need real values set them per-suite.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'jest-stub-anon-key';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-localization', () => ({
  getLocales: () => [
    { languageTag: 'en-US', languageCode: 'en', regionCode: 'US', textDirection: 'ltr' },
  ],
  getCalendars: () => [{ timeZone: 'UTC' }],
}));
