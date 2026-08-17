import * as React from "react";

import {
  builtInMediaItemToFile,
  deleteToolcraftMedia,
  libraryItemToFile,
  listToolcraftMedia,
  TOOLCRAFT_BUILT_IN_MEDIA,
  type ToolcraftBuiltInMediaItem,
  type ToolcraftMediaLibraryItem,
} from "../../media/media-library";
import { useObjectUrl } from "./use-object-url";

type MediaLibraryPickerProps = {
  accept?: string;
  onSelect: (file: File) => void;
};

function acceptsItem(item: ToolcraftMediaLibraryItem, accept?: string): boolean {
  if (!accept) return true;
  return accept.split(",").some((rawRule) => {
    const rule = rawRule.trim().toLowerCase();
    const mime = item.mimeType.toLowerCase();
    if (rule.endsWith("/*")) return mime.startsWith(rule.slice(0, -1));
    if (rule.startsWith(".")) return item.fileName.toLowerCase().endsWith(rule);
    return rule === mime;
  });
}

function acceptsBuiltInItem(item: ToolcraftBuiltInMediaItem, accept?: string): boolean {
  return acceptsItem({ fileName: item.fileName, mimeType: item.mimeType } as ToolcraftMediaLibraryItem, accept);
}

function formatSize(size: number): string {
  if (size < 1_000_000) return `${Math.max(1, Math.round(size / 1000))} KB`;
  return `${(size / 1_000_000).toFixed(size < 10_000_000 ? 1 : 0)} MB`;
}

function LibraryCard({ item, onDelete, onSelect }: {
  item: ToolcraftMediaLibraryItem;
  onDelete: (id: string) => void;
  onSelect: (item: ToolcraftMediaLibraryItem) => void;
}): React.JSX.Element {
  const previewUrl = useObjectUrl(item.blob);
  const isVideo = item.mimeType.startsWith("video/");
  return (
    <article className="group relative min-w-0">
      <button
        aria-label={`Use ${item.fileName}`}
        className="block w-full cursor-pointer rounded-lg border border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:var(--muted)] p-0 outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out hover:border-[color:color-mix(in_oklab,var(--border)_22%,transparent)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_30%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
        onClick={() => onSelect(item)}
        type="button"
      >
        <span className="block aspect-[4/3] overflow-hidden rounded-[inherit] bg-[color:var(--muted)]">
          {!previewUrl ? null : isVideo ? (
            <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={previewUrl} />
          ) : (
            <img alt="" className="h-full w-full object-cover" loading="lazy" src={previewUrl} />
          )}
        </span>
      </button>
      <button
        aria-label={`Remove ${item.fileName} from library`}
        className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md border border-white/10 bg-black/65 text-sm leading-none text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/85 focus-visible:opacity-100 group-hover:opacity-100"
        onClick={() => onDelete(item.id)}
        type="button"
      >
        ×
      </button>
      <div className="mt-1 min-w-0 px-0.5">
        <div className="truncate text-[11px] font-medium">{item.fileName}</div>
        <div className="text-[10px] text-[color:var(--muted-foreground)]">{isVideo ? "Video" : "Image"} · {formatSize(item.size)} · v{item.version}</div>
      </div>
    </article>
  );
}

function BuiltInCard({ item, onSelect }: { item: ToolcraftBuiltInMediaItem; onSelect: (item: ToolcraftBuiltInMediaItem) => void }): React.JSX.Element {
  const isVideo = item.mimeType.startsWith("video/");
  return (
    <article className="group relative min-w-0">
      <button
        aria-label={`Use ${item.name}`}
        className="block w-full cursor-pointer rounded-lg border border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:var(--muted)] p-0 outline-none transition-[border-color,background-color,box-shadow] duration-150 ease-out hover:border-[color:color-mix(in_oklab,var(--border)_22%,transparent)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_30%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
        onClick={() => onSelect(item)}
        type="button"
      >
        <span className="block aspect-[4/3] overflow-hidden rounded-[inherit] bg-[color:var(--muted)]">
          {isVideo ? <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.src} /> : <img alt="" className="h-full w-full object-cover" loading="lazy" src={item.src} />}
        </span>
      </button>
      <div className="mt-1 min-w-0 px-0.5">
        <div className="truncate text-[11px] font-medium">{item.name}</div>
        <div className="text-[10px] text-[color:var(--muted-foreground)]">{isVideo ? "Video" : "Image"} · Built-in</div>
      </div>
    </article>
  );
}

export function MediaLibraryPicker({ accept, onSelect }: MediaLibraryPickerProps): React.JSX.Element {
  const [items, setItems] = React.useState<ToolcraftMediaLibraryItem[]>([]);
  const [selectionError, setSelectionError] = React.useState("");
  const builtInItems = React.useMemo(() => TOOLCRAFT_BUILT_IN_MEDIA.filter((item) => acceptsBuiltInItem(item, accept)), [accept]);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const refresh = React.useCallback(async () => {
    setStatus("loading");
    try {
      setItems((await listToolcraftMedia()).filter((item) => acceptsItem(item, accept)));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [accept]);
  React.useEffect(() => { void refresh(); }, [refresh]);

  const remove = React.useCallback(async (id: string) => {
    await deleteToolcraftMedia(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  if (status === "loading") return <div aria-label="Loading media library" className="toolcraft-control-inline-loading" data-size="large" role="status"><span aria-hidden="true" /></div>;
  if (status === "error") return <div className="rounded-lg border border-dashed p-4 text-center text-xs text-[color:var(--muted-foreground)]">Library unavailable in this browser.</div>;
  return (
    <div className="max-h-80 space-y-3 overflow-y-auto overscroll-contain p-0.5 pr-1">
      {builtInItems.length > 0 ? <section className="space-y-2"><div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">Built-in</div><div className="grid grid-cols-3 gap-[10px]">{builtInItems.map((item) => <BuiltInCard item={item} key={item.id} onSelect={(selected) => { setSelectionError(""); void builtInMediaItemToFile(selected).then(onSelect).catch((error: unknown) => setSelectionError(error instanceof Error ? error.message : "Asset unavailable.")); }} />)}</div></section> : null}
      <section className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">Saved</div>
        {items.length > 0 ? <div className="grid grid-cols-3 gap-[10px]">{items.map((item) => <LibraryCard item={item} key={item.id} onDelete={(id) => void remove(id)} onSelect={(selected) => onSelect(libraryItemToFile(selected))} />)}</div> : <div className="rounded-lg border border-dashed border-[color:color-mix(in_oklab,var(--border)_22%,transparent)] p-4 text-center text-xs text-[color:var(--muted-foreground)]">Saved media will appear here.</div>}
      </section>
      {selectionError ? <p className="text-[11px] text-red-400" role="alert">{selectionError}</p> : null}
    </div>
  );
}
