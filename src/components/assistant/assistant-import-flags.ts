const parseBooleanFlag = (value: string | undefined): boolean | null => {
  if (value === undefined || value.trim() === '') return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
};

const configuredPersistentImports = parseBooleanFlag(
  import.meta.env.VITE_ASSISTANT_PERSISTENT_CLIENT_IMPORTS,
);

export const ASSISTANT_PERSISTENT_CLIENT_IMPORTS_ENABLED =
  configuredPersistentImports ?? (import.meta.env.DEV || import.meta.env.MODE === 'test');

export const reportLegacyClientImportUsage = (): void => {
  const detail = { flow: 'assistant_client_import', adapter: 'legacy', containsPii: false };
  window.dispatchEvent(new CustomEvent('assistant:legacy-import-used', { detail }));
  console.info('[AssistantImport] legacy_client_import_used', detail);
};
