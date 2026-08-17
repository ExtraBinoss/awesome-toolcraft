import * as React from "react";

import { saveToolcraftMediaBlob } from "../../media/media-library";
import { Button } from "../../../ui/components/primitives/button";

export type SaveToLibraryButtonProps = {
  createBlob: () => Blob | Promise<Blob>;
  disabled?: boolean;
  fileName: string | (() => string);
};

export function SaveToLibraryButton({
  createBlob,
  disabled = false,
  fileName,
}: SaveToLibraryButtonProps): React.JSX.Element {
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const resetTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
  }, []);

  const save = async (): Promise<void> => {
    setStatus("saving");
    try {
      const blob = await createBlob();
      await saveToolcraftMediaBlob(blob, typeof fileName === "function" ? fileName() : fileName);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setStatus("idle"), 2200);
  };

  const label = status === "saving"
    ? "Saving…"
    : status === "saved"
      ? "Saved to Library"
      : status === "error"
        ? "Could not save"
        : "Save to Library";

  return (
    <Button
      aria-live="polite"
      disabled={disabled || status === "saving"}
      onClick={() => void save()}
      size="sm"
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  );
}
