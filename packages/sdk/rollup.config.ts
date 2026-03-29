import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import { defineConfig } from "rollup";

export default defineConfig([
  // ESM bundle
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: "./tsconfig.json" })],
  },
  // CJS bundle
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: "./tsconfig.json" })],
  },
  // Type declarations roll-up
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    plugins: [dts()],
  },
]);
