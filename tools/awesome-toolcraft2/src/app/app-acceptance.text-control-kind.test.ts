import { describe, expect, it } from "vitest";
import { defineToolcraft } from "@/toolcraft/runtime";

import { validateContractAcceptance } from "./app-acceptance.contract-fixtures";
import { makeControlAcceptance } from "./app-acceptance.test-utils";

describe("starter acceptance text control kind rules", () => {
  it("rejects CodeTextarea for short single-line text content", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                buttonText: {
                  defaultValue: "Glass",
                  label: "Text",
                  target: "button.text",
                  textValueKind: "single-line",
                  type: "code",
                },
              },
              title: "Button",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schema,
        acceptance: [
          makeControlAcceptance("button.text", "code"),
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'declares textValueKind "single-line" and must use type "text"',
        ),
      ]),
    );
  });

  it("allows CodeTextarea when a short default documents long multiline intent", () => {
    const schema = defineToolcraft({
      canvas: { enabled: true },
      panels: {
        controls: {
          sections: [
            {
              controls: {
                prompt: {
                  defaultValue: "Describe the scene",
                  description:
                    "Long multiline prompt content for generated output.",
                  label: "Prompt",
                  target: "generation.prompt",
                  textValueKind: "multiline",
                  type: "code",
                },
              },
              title: "Generation",
            },
          ],
          title: "Controls",
        },
      },
    });

    expect(
      validateContractAcceptance({
        schema: schema,
        acceptance: [
          makeControlAcceptance("generation.prompt", "code"),
        ],
      }),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'declares textValueKind "single-line" and must use type "text"',
        ),
      ]),
    );
  });
});
