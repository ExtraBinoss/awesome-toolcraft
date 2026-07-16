"use client";

import { CloudArrowUpIcon } from "@phosphor-icons/react";

import type { FileDropAssetKind } from "./file-drop-types";

type FileDropEmptyStateProps = {
  assetKind: FileDropAssetKind;
};

export function FileDropEmptyState({
  assetKind,
}: FileDropEmptyStateProps): React.JSX.Element {
  return (
    <>
      <CloudArrowUpIcon
        className="size-6 flex-none text-[color:var(--muted-foreground)] transition-colors duration-150 ease-out group-data-[drag-over=true]/file-upload:text-[color:var(--link)]"
        weight="light"
      />
      <p className="m-0 flex max-w-full flex-col text-xs leading-tight text-[color:color-mix(in_oklab,var(--foreground)_60%,transparent)] transition-colors duration-150 ease-out group-hover/file-upload:text-[color:color-mix(in_oklab,var(--foreground)_85%,transparent)] group-data-[drag-over=true]/file-upload:text-[color:var(--link)]">
        {assetKind === "file" ? (
          <>
            <span>Click to upload a file</span>
            <span>or drag it onto the canvas</span>
          </>
        ) : (
          <>
            <span>Click to upload an image</span>
            <span>or drag it onto the canvas</span>
          </>
        )}
      </p>
    </>
  );
}
