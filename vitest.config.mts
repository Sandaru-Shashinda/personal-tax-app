import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(import.meta.dirname),
  "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
};

// Two projects: fast pure unit tests, and integration tests that run the real services against
// a dedicated PostgreSQL database (created and seeded by the global setup).
export default defineConfig({
  resolve: { alias },
  test: {
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "services/**/*.ts"],
      exclude: ["lib/tax/data/**", "lib/integrations/**", "**/*.d.ts"],
      reporter: ["text-summary", "text"],
    },
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", environment: "node", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/setup/global.ts"],
          setupFiles: ["tests/integration/setup/env.ts"],
          // One shared database: run files one at a time.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
