// Which database's import dialog is open, and with which file. The menu
// item that picks the file lives in the view options, which close right
// away; the dialog itself is drawn by the database (CsvImportHost), so it
// stays open.

type OpenImport = { databaseId: string; file: File } | null;

let current: OpenImport = null;
const listeners = new Set<() => void>();

export const csvImportStore = {
  open(databaseId: string, file: File) {
    current = { databaseId, file };
    listeners.forEach((l) => l());
  },
  close() {
    current = null;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): OpenImport => current,
};
