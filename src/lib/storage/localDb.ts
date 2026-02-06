import { openDB, type DBSchema } from "idb";
import type { Document, DocVersion, Folder, Share } from "../../types";

interface MarkdownDb extends DBSchema {
  folders: {
    key: string;
    value: Folder;
  };
  documents: {
    key: string;
    value: Document;
  };
  versions: {
    key: string;
    value: DocVersion;
    indexes: { "by-document": string };
  };
  shares: {
    key: string;
    value: Share;
    indexes: { "by-document": string; "by-token": string };
  };
}

const dbPromise = openDB<MarkdownDb>("inkline-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("folders")) {
      db.createObjectStore("folders", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("documents")) {
      db.createObjectStore("documents", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("versions")) {
      const store = db.createObjectStore("versions", { keyPath: "id" });
      store.createIndex("by-document", "documentId");
    }
    if (!db.objectStoreNames.contains("shares")) {
      const store = db.createObjectStore("shares", { keyPath: "id" });
      store.createIndex("by-document", "documentId");
      store.createIndex("by-token", "token");
    }
  },
});

const getAll = async <T>(storeName: keyof MarkdownDb) => {
  const db = await dbPromise;
  return db.getAll(storeName) as Promise<T[]>;
};

const put = async <T>(storeName: keyof MarkdownDb, value: T) => {
  const db = await dbPromise;
  return db.put(storeName, value);
};

const bulkPut = async <T>(storeName: keyof MarkdownDb, values: T[]) => {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  await Promise.all(values.map((value) => tx.store.put(value)));
  await tx.done;
};

const remove = async (storeName: keyof MarkdownDb, key: string) => {
  const db = await dbPromise;
  return db.delete(storeName, key);
};

const clear = async (storeName: keyof MarkdownDb) => {
  const db = await dbPromise;
  return db.clear(storeName);
};

const getShareByToken = async (token: string) => {
  const db = await dbPromise;
  return db.getFromIndex("shares", "by-token", token);
};

const getVersionsByDocument = async (documentId: string) => {
  const db = await dbPromise;
  return db.getAllFromIndex("versions", "by-document", documentId);
};

export const localDb = {
  getAll,
  put,
  bulkPut,
  remove,
  clear,
  getShareByToken,
  getVersionsByDocument,
};
