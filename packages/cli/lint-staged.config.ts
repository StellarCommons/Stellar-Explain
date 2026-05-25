import type { Config } from "lint-staged";

/**
 * lint-staged config for packages/cli
 * Runs ESLint and Prettier on staged .ts files before commit.
 */
const config: Config = {
  "src/**/*.ts": [
    "eslint --fix --max-warnings=0",
    "prettier --write",
  ],
  "scripts/**/*.ts": [
    "eslint --fix --max-warnings=0",
    "prettier --write",
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write",
  ],
};

export default config;
