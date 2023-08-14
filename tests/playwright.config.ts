import type { PlaywrightTestConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config()

const config: PlaywrightTestConfig = {

  testDir: ".",
  testMatch: '*.spec.ts',
  timeout: 30 * 1000,

  expect: {
    timeout: 7000
  },

  reporter: [
		["../lib/index.js"]
	],

  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
  },

};

export default config;