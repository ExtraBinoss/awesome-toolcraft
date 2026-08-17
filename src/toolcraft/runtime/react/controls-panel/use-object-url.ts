import * as React from "react";

type CachedObjectUrl = { references: number; url: string };

const objectUrlCache = new WeakMap<Blob, CachedObjectUrl>();

export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = React.useState<string>();

  React.useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return undefined;
    }

    let cached = objectUrlCache.get(blob);
    if (cached) {
      cached.references += 1;
    } else {
      cached = { references: 1, url: URL.createObjectURL(blob) };
      objectUrlCache.set(blob, cached);
    }
    setUrl(cached.url);
    return () => {
      const current = objectUrlCache.get(blob);
      if (!current) return;
      current.references -= 1;
      if (current.references > 0) return;
      URL.revokeObjectURL(current.url);
      objectUrlCache.delete(blob);
    };
  }, [blob]);

  return url;
}
