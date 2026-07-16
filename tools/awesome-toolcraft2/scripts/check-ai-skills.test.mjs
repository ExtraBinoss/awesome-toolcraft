import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./check-ai-skills.mjs", import.meta.url));
const skillNames = [
  "brainstorming",
  "writing-plans",
  "systematic-debugging",
  "figma",
  "figma-implement-design",
  "browser",
];

async function withCleanHome(callback) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-skills-"));
  const env = {
    ...process.env,
    CLAUDE_HOME: path.join(home, ".claude"),
    CODEX_HOME: path.join(home, ".codex"),
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
  };

  try {
    await callback({ env, home });
  } finally {
    await fs.rm(home, { force: true, recursive: true });
  }
}

test("missing external skills use the signed local contract fallback", async () => {
  await withCleanHome(async ({ env }) => {
    const result = await execFileAsync(process.execPath, [scriptPath], { env });

    assert.match(result.stderr, /Optional AI workflow skills are not installed/);
    assert.match(result.stderr, /Signed local AGENTS\.md and docs\/toolcraft/);
    assert.match(result.stderr, /continue with the local Toolcraft workflow/i);
  });
});

test("installed external skills are still discovered and reported", async () => {
  await withCleanHome(async ({ env, home }) => {
    for (const skillName of skillNames) {
      const skillPath = path.join(home, ".codex", "skills", skillName, "SKILL.md");
      await fs.mkdir(path.dirname(skillPath), { recursive: true });
      await fs.writeFile(skillPath, `# ${skillName}\n`);
    }

    const result = await execFileAsync(process.execPath, [scriptPath], { env });

    assert.match(result.stdout, /AI workflow skills are installed/);
    for (const skillName of skillNames) {
      assert.match(result.stdout, new RegExp(`- ${skillName}:`));
    }
    assert.equal(result.stderr, "");
  });
});
