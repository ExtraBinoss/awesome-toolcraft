import type {
  ToolcraftLocalStoragePersistenceSchema,
  ResolvedToolcraftAppSchema,
} from "../schema/types";
import { readToolcraftPersistedInitialState } from "./persistence-readers";
import { isToolcraftPersistenceRecord } from "./persistence-shared";
import type { ToolcraftInitialState } from "./types";

export type { ToolcraftPersistencePayload } from "./persistence-shared";
export { mergeToolcraftInitialState } from "./persistence-merge";
export { createToolcraftPersistenceSnapshot } from "./persistence-snapshot";

export function parseToolcraftPersistenceSnapshot(
  schema: ResolvedToolcraftAppSchema,
  rawValue: string | null,
): ToolcraftInitialState | undefined {
  const persistence = schema.persistence;

  if (persistence.storage !== "localStorage" || !rawValue) {
    return undefined;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawValue);
  } catch {
    return undefined;
  }

  if (
    !isToolcraftPersistenceRecord(payload) ||
    payload.version !== persistence.version ||
    !isToolcraftPersistenceRecord(payload.state)
  ) {
    return undefined;
  }

  return readToolcraftPersistedInitialState(
    schema,
    payload.state,
    new Set(persistence.include),
  );
}

export function getToolcraftPersistenceKey(
  persistence: ResolvedToolcraftAppSchema["persistence"],
): ToolcraftLocalStoragePersistenceSchema["key"] | undefined {
  return persistence.storage === "localStorage" ? persistence.key : undefined;
}
