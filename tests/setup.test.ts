import { describe, it, expect } from "vitest";

describe("project setup", () => {
  it("TypeScript strict mode is enabled", async () => {
    const tsconfig = await import("../tsconfig.json");
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
});
