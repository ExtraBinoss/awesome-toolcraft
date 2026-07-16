import type { ToolcraftControlSchema } from "../../schema/types";
import type { ToolcraftState } from "../../state/types";
import {
  isToolcraftControlVisible,
  isToolcraftSectionVisible,
} from "../controls-panel/conditions/control-conditions";
import { isToolcraftImageFile } from "./media-file";

function getFileExtension(file: File): string {
  const match = /\.([a-z0-9]+)$/iu.exec(file.name);

  return match?.[1]?.toLowerCase() ?? "";
}

function controlAcceptsFile(control: ToolcraftControlSchema, file: File): boolean {
  const accept = control.accept?.trim();

  if (!accept) {
    return control.assetKind === "file" || isToolcraftImageFile(file);
  }

  const fileExtension = getFileExtension(file);
  const mimeType = file.type.toLowerCase();

  return accept.split(",").some((rawToken) => {
    const token = rawToken.trim().toLowerCase();

    if (!token) {
      return false;
    }

    if (token.startsWith(".")) {
      return token.slice(1) === fileExtension;
    }

    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1);

      return mimeType.startsWith(prefix);
    }

    if (token.includes("/")) {
      return mimeType === token;
    }

    return token === fileExtension;
  });
}

export function getVisibleFileDropControls(state: ToolcraftState): ToolcraftControlSchema[] {
  return (state.schema.panels.controls?.sections ?? []).flatMap((section) => {
    if (!isToolcraftSectionVisible(state, section)) {
      return [];
    }

    return Object.values(section.controls).filter(
      (control) =>
        control.type === "fileDrop" && isToolcraftControlVisible(state, control),
    );
  });
}

export function getCanvasDropTarget(
  state: ToolcraftState,
  file: File,
): ToolcraftControlSchema | null {
  const isImage = isToolcraftImageFile(file);
  const controls = getVisibleFileDropControls(state).filter((control) =>
    controlAcceptsFile(control, file),
  );
  const preferredAssetKind = isImage ? "image" : "file";
  const exactMatch = controls.find(
    (control) =>
      (control.assetKind === "file" ? "file" : "image") === preferredAssetKind,
  );

  if (exactMatch) {
    return exactMatch;
  }

  return isImage
    ? (controls.find((control) => control.assetKind === "file") ?? null)
    : null;
}
