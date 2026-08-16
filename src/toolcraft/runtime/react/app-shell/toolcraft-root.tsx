"use client";

import * as React from "react";

import type { ResolvedToolcraftAppSchema } from "../../schema/types";
import {
  createToolcraftPersistenceSnapshot,
  getToolcraftPersistenceKey,
  mergeToolcraftInitialState,
  parseToolcraftPersistenceSnapshot,
} from "../../state/persistence";
import { createToolcraftStore } from "../../state/store";
import type {
  ToolcraftInitialState,
  ToolcraftMediaAsset,
  ToolcraftState,
} from "../../state/types";
import { readToolcraftLocalStorageValue } from "./storage-key-migration";
import { ToolcraftThemeProvider } from "./theme-runtime";
import { ToolcraftStoreProvider } from "./toolcraft-store-provider";
import { ToolcraftPlaybackClock } from "./toolcraft-playback-clock";
import { logToolLoadDuration } from "@/tool-load-debug";

export type ToolcraftRootProps = {
  children: React.ReactNode;
  initialState?: ToolcraftInitialState;
  schema: ResolvedToolcraftAppSchema;
};

type PersistenceWriteCache = {
  lastMainSerialized?: string;
  lastMediaAssets?: ToolcraftMediaAsset[];
  lastMediaSerialized?: string;
};

type ToolcraftIdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

const persistenceDebounceMs = 300;
const persistenceIdleTimeoutMs = 1_500;

function getToolcraftMediaPersistenceKey(storageKey: string): string {
  return `${storageKey}:media`;
}

function readPersistedInitialState(
  schema: ResolvedToolcraftAppSchema,
): ToolcraftInitialState | undefined {
  const storageKey = getToolcraftPersistenceKey(schema.persistence);

  if (!storageKey || typeof window === "undefined") {
    return undefined;
  }

  try {
    const persistedState = parseToolcraftPersistenceSnapshot(
      schema,
      readToolcraftLocalStorageValue(storageKey),
    );
    const persistedMediaState = parseToolcraftPersistenceSnapshot(
      schema,
      readToolcraftLocalStorageValue(getToolcraftMediaPersistenceKey(storageKey)),
    );

    return mergeToolcraftInitialState(persistedState, persistedMediaState);
  } catch {
    return undefined;
  }
}

function writePersistedState(
  schema: ResolvedToolcraftAppSchema,
  state: ToolcraftState,
  cache: PersistenceWriteCache,
): void {
  const storageKey = getToolcraftPersistenceKey(schema.persistence);

  if (!storageKey || typeof window === "undefined") {
    return;
  }

  const snapshot = createToolcraftPersistenceSnapshot(state, schema.persistence);

  if (!snapshot) {
    return;
  }

  const mainState = { ...snapshot.state };
  delete mainState.mediaAssets;

  try {
    const mainSerialized = JSON.stringify({
      ...snapshot,
      state: mainState,
    });

    if (mainSerialized !== cache.lastMainSerialized) {
      window.localStorage.setItem(storageKey, mainSerialized);
      cache.lastMainSerialized = mainSerialized;
    }
  } catch {
    // Persistence is best-effort; runtime state stays authoritative when storage is unavailable.
  }

  if (
    schema.persistence.storage !== "localStorage" ||
    !schema.persistence.include.includes("media")
  ) {
    return;
  }

  const mediaStorageKey = getToolcraftMediaPersistenceKey(storageKey);

  if (state.mediaAssets === cache.lastMediaAssets) {
    return;
  }

  try {
    const mediaSerialized = JSON.stringify({
      state: { mediaAssets: state.mediaAssets },
      version: snapshot.version,
    });

    if (mediaSerialized !== cache.lastMediaSerialized) {
      window.localStorage.setItem(mediaStorageKey, mediaSerialized);
      cache.lastMediaSerialized = mediaSerialized;
    }
    cache.lastMediaAssets = state.mediaAssets;
  } catch {
    // Large files can exceed storage quota; the rest of the state is still persisted.
  }
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }

  const candidate = target as {
    closest?: (selector: string) => Element | null;
    isContentEditable?: boolean;
    tagName?: string;
  };

  if (candidate.isContentEditable) {
    return true;
  }

  if (typeof candidate.closest === "function" && candidate.closest("[contenteditable='true']")) {
    return true;
  }

  const tagName = candidate.tagName?.toLowerCase();

  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function isUndoShortcut(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "z"
  );
}

function isRedoShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();

  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    ((event.shiftKey && key === "z") || (!event.metaKey && event.ctrlKey && key === "y"))
  );
}

export function ToolcraftRoot({
  children,
  initialState,
  schema,
}: ToolcraftRootProps) {
  const [store] = React.useState(() => {
    const startedAt = performance.now();
    const nextStore = createToolcraftStore({
      initialState: mergeToolcraftInitialState(
        readPersistedInitialState(schema),
        initialState,
      ),
      schema,
    });
    logToolLoadDuration("runtime:state initialized", startedAt);
    return nextStore;
  });
  const persistenceWriteCacheRef = React.useRef<PersistenceWriteCache>({});

  React.useEffect(() => {
    if (!schema.toolbar.history || typeof document === "undefined") {
      return undefined;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (isUndoShortcut(event)) {
        event.preventDefault();
        store.dispatch({ type: "history.undo" });
        return;
      }

      if (isRedoShortcut(event)) {
        event.preventDefault();
        store.dispatch({ type: "history.redo" });
      }
    };

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [schema.toolbar.history, store]);

  React.useEffect(() => {
    if (schema.persistence.storage !== "localStorage") {
      return undefined;
    }

    const idleWindow = window as ToolcraftIdleWindow;
    let idleCallback = 0;
    let persistTimer = 0;
    const schedulePersistence = (): void => {
      window.clearTimeout(persistTimer);
      if (idleCallback && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleCallback);
        idleCallback = 0;
      }
      persistTimer = window.setTimeout(() => {
        const persist = () => {
          writePersistedState(schema, store.getState(), persistenceWriteCacheRef.current);
        };

        if (typeof idleWindow.requestIdleCallback === "function") {
          idleCallback = idleWindow.requestIdleCallback(persist, {
            timeout: persistenceIdleTimeoutMs,
          });
        } else {
          persist();
        }
      }, persistenceDebounceMs);
    };
    const unsubscribe = store.subscribe(schedulePersistence);

    return () => {
      unsubscribe();
      window.clearTimeout(persistTimer);
      if (idleCallback && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleCallback);
      }
    };
  }, [schema, store]);

  React.useEffect(() => {
    if (schema.persistence.storage !== "localStorage") {
      return undefined;
    }

    const handlePageHide = () => {
      store.syncPlayhead();
      writePersistedState(
        schema,
        store.getState(),
        persistenceWriteCacheRef.current,
      );
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [schema, store]);

  React.useEffect(() => () => store.dispose(), [store]);

  return (
    <ToolcraftThemeProvider>
      <ToolcraftStoreProvider store={store}>
        <ToolcraftPlaybackClock />
        {children}
      </ToolcraftStoreProvider>
    </ToolcraftThemeProvider>
  );
}
