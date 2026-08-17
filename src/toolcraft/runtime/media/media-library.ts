export type ToolcraftMediaLibraryItem = {
  blob: Blob;
  createdAt: number;
  fileName: string;
  id: string;
  lastModified: number;
  mimeType: string;
  size: number;
  version: number;
};

export type ToolcraftBuiltInMediaItem = {
  fileName: string;
  id: string;
  mimeType: string;
  name: string;
  src: string;
};

export const TOOLCRAFT_BUILT_IN_MEDIA: readonly ToolcraftBuiltInMediaItem[] = [
  { fileName: "gnou.jpg", id: "builtin-gnou", mimeType: "image/jpeg", name: "Gnou", src: withBasePath("/baseAssets/images/gnou.jpg") },
  { fileName: "Clione.jpg", id: "builtin-clione", mimeType: "image/jpeg", name: "Clione", src: withBasePath("/baseAssets/images/Clione.jpg") },
  { fileName: "papillon_monarque.jpg", id: "builtin-papillon", mimeType: "image/jpeg", name: "Papillon monarque", src: withBasePath("/baseAssets/images/papillon_monarque.jpg") },
  { fileName: "jellyfish.webm", id: "builtin-jellyfish", mimeType: "video/webm", name: "Jellyfish", src: withBasePath("/baseAssets/videos/jellyfish.webm") },
  { fileName: "cat_candle.webm", id: "builtin-cat-candle", mimeType: "video/webm", name: "Cat candle", src: withBasePath("/baseAssets/videos/cat_candle.webm") },
  { fileName: "pinguin.webm", id: "builtin-pinguin", mimeType: "video/webm", name: "Pinguin", src: withBasePath("/baseAssets/videos/pinguin.webm") },
];

const DATABASE_NAME = "toolcraft-media-library";
const DATABASE_VERSION = 2;
const STORE_NAME = "assets";
const libraryFiles = new WeakSet<File>();

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: "id" });
      if (store) {
        if (!store.indexNames.contains("fingerprint")) {
        store.createIndex("fingerprint", ["fileName", "size", "lastModified"], { unique: false });
        }
        if (!store.indexNames.contains("fileName")) store.createIndex("fileName", "fileName", { unique: false });
        if (!store.indexNames.contains("createdAt")) {
        store.createIndex("createdAt", "createdAt", { unique: false });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The media library could not be opened."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The media library request failed."));
  });
}

export async function listToolcraftMedia(): Promise<ToolcraftMediaLibraryItem[]> {
  const database = await openLibrary();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const items = await requestResult(transaction.objectStore(STORE_NAME).getAll() as IDBRequest<ToolcraftMediaLibraryItem[]>);
    return items.map((item) => ({ ...item, version: item.version ?? 1 })).sort((left, right) => right.createdAt - left.createdAt);
  } finally {
    database.close();
  }
}

export async function saveToolcraftMedia(file: File): Promise<ToolcraftMediaLibraryItem> {
  const database = await openLibrary();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const versions = await requestResult(store.index("fileName").getAll(file.name) as IDBRequest<ToolcraftMediaLibraryItem[]>);
    const version = versions.reduce((highest, item) => Math.max(highest, item.version ?? 1), 0) + 1;
    const item: ToolcraftMediaLibraryItem = {
      blob: file,
      createdAt: Date.now(),
      fileName: file.name,
      id: crypto.randomUUID(),
      lastModified: file.lastModified,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      version,
    };
    await requestResult(store.put(item));
    return item;
  } finally {
    database.close();
  }
}

export async function deleteToolcraftMedia(id: string): Promise<void> {
  const database = await openLibrary();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await requestResult(transaction.objectStore(STORE_NAME).delete(id));
  } finally {
    database.close();
  }
}

export function libraryItemToFile(item: ToolcraftMediaLibraryItem): File {
  const file = new File([item.blob], item.fileName, { lastModified: item.createdAt * 1000 + item.version, type: item.mimeType });
  libraryFiles.add(file);
  return file;
}

export function isToolcraftLibraryFile(file: File): boolean {
  return libraryFiles.has(file);
}

export async function builtInMediaItemToFile(item: ToolcraftBuiltInMediaItem): Promise<File> {
  const response = await fetch(item.src);
  if (!response.ok) throw new Error(`Could not load ${item.name}.`);
  const file = new File([await response.blob()], item.fileName, { lastModified: 1, type: item.mimeType });
  libraryFiles.add(file);
  return file;
}

export function saveToolcraftMediaBlob(blob: Blob, fileName: string): Promise<ToolcraftMediaLibraryItem> {
  return saveToolcraftMedia(new File([blob], fileName, { lastModified: Date.now(), type: blob.type || "application/octet-stream" }));
}
import { withBasePath } from "@/base-path";
