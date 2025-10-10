// import commonjs from "@rollup/plugin-commonjs";
// import { nodeResolve } from "@rollup/plugin-node-resolve";

// const config = {
//   input: "src/index.js",
//   output: {
//     esModule: true,
//     file: "dist/index.js",
//     format: "es",
//     sourcemap: true,
//   },
//   plugins: [commonjs(), nodeResolve({ preferBuiltins: true })],
// };

// export default config;


import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";

/**
 * Standard configuration for bundling a GitHub Action written in JavaScript
 * into a single CommonJS file for deployment.
 */
export default {
  // Input file is the main action logic
  input: "src/index.js", 
  output: {
    // Output should be a single file in the 'dist' folder
    file: "dist/index.js", 
    // Format must be CommonJS for GitHub Actions' Node runner
    format: "cjs", 
    // Sourcemaps help with debugging
    sourcemap: true, 
  },
  plugins: [
    // Resolves Node.js modules, so Rollup knows how to find packages like @actions/core
    nodeResolve(), 
    // Converts CommonJS modules (like child_process) into ES modules
    commonjs(), 
  ],
  // Prevents bundling external modules like 'fs/promises' and 'child_process' 
  // which are built-in to Node.js environments.
  external: ['@actions/core', 'child_process', 'fs/promises'],
};
