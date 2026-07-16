import { describe, expect, it } from "vitest";

import { isNeutralTemplateProject } from "./app-acceptance.product-readiness-test-utils";

describe("Toolcraft product readiness rules", () => {
  it("does not classify a generated app named starter as the source template", () => {
    expect(
      isNeutralTemplateProject({
        hasGeneratedManifest: true,
        projectName: "starter",
      }),
    ).toBe(false);
  });
});
