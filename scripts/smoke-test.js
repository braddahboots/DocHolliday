#!/usr/bin/env node
/**
 * Smoke test for DocHolliday
 * Spawns `npm run dev` and waits for the Next.js dev server to be ready.
 * Exits 0 on success, 1 on failure or timeout.
 *
 * Usage: node scripts/smoke-test.js
 */

const { spawn } = require("child_process");

const TIMEOUT_MS = 30000; // 30 seconds max
const SUCCESS_PATTERNS = [/ready/i, /started server/i, /localhost:\d+/i];
const FAILURE_PATTERNS = [
  /FATAL ERROR/i,
  /Error:/,
  /MODULE_NOT_FOUND/,
  /Cannot find module/,
  /EADDRINUSE/,
];

let devProcess = null;
let settled = false;

function cleanup(code) {
  if (devProcess && !devProcess.killed) {
    devProcess.kill("SIGTERM");
  }
  if (!settled) {
    settled = true;
    process.exit(code);
  }
}

// Safety-net timeout
const timer = setTimeout(() => {
  console.error("SMOKE TEST TIMEOUT: Dev server did not start within " + TIMEOUT_MS + "ms");
  cleanup(1);
}, TIMEOUT_MS);

devProcess = spawn("npm", ["run", "dev"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: "3999" },
  shell: true,
});

function checkOutput(data) {
  const text = data.toString();
  process.stdout.write(text);

  for (const pattern of FAILURE_PATTERNS) {
    if (pattern.test(text)) {
      console.error("\nSMOKE TEST FAILED: Detected failure pattern: " + pattern);
      clearTimeout(timer);
      cleanup(1);
      return;
    }
  }

  for (const pattern of SUCCESS_PATTERNS) {
    if (pattern.test(text)) {
      console.log("\nSMOKE TEST PASSED: Dev server started successfully");
      clearTimeout(timer);
      cleanup(0);
      return;
    }
  }
}

devProcess.stdout.on("data", checkOutput);
devProcess.stderr.on("data", checkOutput);

devProcess.on("exit", (code) => {
  if (!settled) {
    console.error("SMOKE TEST FAILED: Dev server exited with code " + code + " before becoming ready");
    clearTimeout(timer);
    cleanup(1);
  }
});

process.on("SIGINT", () => cleanup(1));
process.on("SIGTERM", () => cleanup(1));
