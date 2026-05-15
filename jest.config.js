module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      setupFiles: ['<rootDir>/jest.setup.ts'],
      testMatch: ['<rootDir>/app/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.test.{ts,tsx}'],
      transformIgnorePatterns: [
        'node_modules/(?!\\.pnpm/)(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'scripts',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/scripts/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
      },
    },
    {
      displayName: 'perf',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/perf/**/*.test.ts'],
      setupFiles: ['<rootDir>/jest.setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs', jsx: 'react-jsx' } }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'eslint-rules',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/eslint-rules/__tests__/**/*.test.js'],
    },
    {
      displayName: 'security',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/security/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
      },
    },
    {
      displayName: 'tenant-landing',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tenant-landing/src/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: {
              module: 'commonjs',
              jsx: 'react-jsx',
              esModuleInterop: true,
              moduleResolution: 'node',
              baseUrl: './tenant-landing',
              paths: { '@/*': ['./src/*'] },
            },
          },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/tenant-landing/src/$1',
      },
    },
  ],
};
