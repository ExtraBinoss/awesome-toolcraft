import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const projectDir = join(appDir, "../..");

export type NeutralTemplateProjectSignals = {
  hasGeneratedManifest: boolean;
  projectName: string;
};

export function isNeutralTemplateProject(
  signals: NeutralTemplateProjectSignals = {
    hasGeneratedManifest: existsSync(
      join(projectDir, "src/toolcraft/.toolcraft-manifest.json"),
    ),
    projectName: basename(projectDir),
  },
): boolean {
  return (
    !signals.hasGeneratedManifest &&
    new Set(["starter", "toolcraft-template"]).has(signals.projectName)
  );
}
