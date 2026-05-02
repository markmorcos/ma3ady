jest.mock('expo-localization', () => ({
  getLocales: () => [
    { languageTag: 'en-US', languageCode: 'en', regionCode: 'US', textDirection: 'ltr' },
  ],
  getCalendars: () => [{ timeZone: 'UTC' }],
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => undefined;
  return Reanimated;
});
