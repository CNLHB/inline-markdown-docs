import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  Document,
  DocVersion,
  Folder,
  SearchFilters,
  Share,
} from "../types";
import { localDb } from "../lib/storage/localDb";
import { isSupabaseConfigured } from "../lib/supabase/client";
import {
  mergeRemote,
  pullRemoteData,
  pushRemoteData,
} from "../lib/supabase/sync";

type EditorMode = "wysiwyg" | "source";

type WorkspaceState = {
  userId: string;
  folders: Folder[];
  documents: Document[];
  versions: DocVersion[];
  shares: Share[];
  activeFolderId: string | null;
  activeDocId: string | null;
  editorMode: EditorMode;
  searchQuery: string;
  searchFilters: SearchFilters;
  hydrated: boolean;
  syncStatus: "idle" | "syncing" | "error";
  syncError: string | null;
  setUserId: (userId: string) => void;
  loadWorkspace: (userIdOverride?: string) => Promise<void>;
  setActiveFolder: (folderId: string | null) => void;
  setActiveDoc: (docId: string | null) => void;
  setEditorMode: (mode: EditorMode) => void;
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  renameFolder: (folderId: string, name: string) => Promise<void>;
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  createDocument: (title: string, folderId: string | null) => Promise<void>;
  updateDocument: (docId: string, patch: Partial<Document>) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  saveVersion: (docId: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  addTag: (docId: string, tag: string) => Promise<void>;
  removeTag: (docId: string, tag: string) => Promise<void>;
  createShare: (docId: string) => Promise<Share>;
  deleteShare: (shareId: string) => Promise<void>;
  applyRemoteDoc: (doc: Document) => Promise<void>;
  removeRemoteDoc: (docId: string) => Promise<void>;
  applyRemoteFolder: (folder: Folder) => Promise<void>;
  removeRemoteFolder: (folderId: string) => Promise<void>;
  syncNow: () => Promise<void>;
};

const nowIso = () => new Date().toISOString();

const scheduleSync = (() => {
  let timer: number | null = null;
  return (fn: () => void) => {
    if (!isSupabaseConfigured) return;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(fn, 1200);
  };
})();

const ensureDefaultData = async (userId: string) => {
  const folderId = nanoid();
  const docId = nanoid();
  const now = nowIso();
  const folder: Folder = {
    id: folderId,
    userId,
    parentId: null,
    name: "快速开始 / Getting Started",
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
  const doc: Document = {
    id: docId,
    userId,
    folderId,
    title: "欢迎 / Welcome",
    contentMd:
      "# 欢迎 / Welcome\n\n这是你的 Inkline 工作区。你可以在左侧管理文件夹与文档，在中间编辑，在右侧预览。\n\nThis is your Inkline workspace. Manage folders and documents on the left, edit in the center, preview on the right.\n\n## 快速开始 / Quick Start\n- 使用 WYSIWYG 或源码模式\n- 保存版本历史\n- 生成分享链接\n- 导出 HTML / PDF\n\n## 使用提示 / Tips\n- 拖拽图片或上传以插入\n- 使用标签管理与筛选文档\n- 搜索支持标题 + 内容\n\n- Drag images into the editor or upload to insert\n- Use tags to organize and filter documents\n- Search supports title + content",
    contentHtml: "",
    tags: ["welcome"],
    createdAt: now,
    updatedAt: now,
  };
  await localDb.bulkPut("folders", [folder]);
  await localDb.bulkPut("documents", [doc]);
  return { folders: [folder], documents: [doc], versions: [], shares: [] };
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  userId: "local-user",
  folders: [],
  documents: [],
  versions: [],
  shares: [],
  activeFolderId: null,
  activeDocId: null,
  editorMode: "wysiwyg",
  searchQuery: "",
  searchFilters: { scope: "all", dateRange: "any" },
  hydrated: false,
  syncStatus: "idle",
  syncError: null,
  setUserId: (userId) => set({ userId }),
  loadWorkspace: async (userIdOverride) => {
    const userId = userIdOverride ?? get().userId;
    const [folders, documents, versions, shares] = await Promise.all([
      localDb.getAll<Folder>("folders"),
      localDb.getAll<Document>("documents"),
      localDb.getAll<DocVersion>("versions"),
      localDb.getAll<Share>("shares"),
    ]);

    const normalizedFolders = folders.map((folder) =>
      folder.userId === userId ? folder : { ...folder, userId },
    );
    const normalizedDocs = documents.map((doc) =>
      doc.userId === userId ? doc : { ...doc, userId },
    );

    const needsUserUpdate =
      folders.some((folder) => folder.userId !== userId) ||
      documents.some((doc) => doc.userId !== userId);

    if (needsUserUpdate) {
      await Promise.all([
        localDb.bulkPut("folders", normalizedFolders),
        localDb.bulkPut("documents", normalizedDocs),
      ]);
    }

    let payload = {
      folders: normalizedFolders,
      documents: normalizedDocs,
      versions,
      shares,
    };
    if (payload.folders.length === 0 && payload.documents.length === 0) {
      payload = await ensureDefaultData(userId);
    }

    set({
      folders: payload.folders,
      documents: payload.documents,
      versions: payload.versions,
      shares: payload.shares,
      activeFolderId: payload.folders[0]?.id ?? null,
      activeDocId: payload.documents[0]?.id ?? null,
      hydrated: true,
    });

    if (isSupabaseConfigured) {
      scheduleSync(() => {
        get().syncNow();
      });
    }
  },
  setActiveFolder: (folderId) => set({ activeFolderId: folderId }),
  setActiveDoc: (docId) =>
    set((state) => ({
      activeDocId: docId,
      activeFolderId:
        docId === null
          ? state.activeFolderId
          : (state.documents.find((doc) => doc.id === docId)?.folderId ?? null),
    })),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  createFolder: async (name, parentId) => {
    const userId = get().userId;
    const now = nowIso();
    const folder: Folder = {
      id: nanoid(),
      userId,
      parentId,
      name,
      sortIndex: get().folders.length,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ folders: [...state.folders, folder] }));
    await localDb.put("folders", folder);
    scheduleSync(() => get().syncNow());
  },
  renameFolder: async (folderId, name) => {
    const now = nowIso();
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name, updatedAt: now } : folder,
      ),
    }));
    const folder = get().folders.find((item) => item.id === folderId);
    if (folder) await localDb.put("folders", folder);
    scheduleSync(() => get().syncNow());
  },
  moveFolder: async (folderId, parentId) => {
    const now = nowIso();
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId
          ? { ...folder, parentId, updatedAt: now }
          : folder,
      ),
    }));
    const folder = get().folders.find((item) => item.id === folderId);
    if (folder) await localDb.put("folders", folder);
    scheduleSync(() => get().syncNow());
  },
  deleteFolder: async (folderId) => {
    const { folders, documents } = get();
    const folder = folders.find((item) => item.id === folderId);
    const parentId = folder?.parentId ?? null;
    const updatedDocs = documents.map((doc) =>
      doc.folderId === folderId ? { ...doc, folderId: parentId } : doc,
    );
    const updatedFolders = folders
      .filter((item) => item.id !== folderId)
      .map((item) =>
        item.parentId === folderId
          ? { ...item, parentId, updatedAt: nowIso() }
          : item,
      );

    set(() => ({
      folders: updatedFolders,
      documents: updatedDocs,
    }));
    await localDb.remove("folders", folderId);
    await localDb.bulkPut("folders", updatedFolders);
    await localDb.bulkPut("documents", updatedDocs);
    scheduleSync(() => get().syncNow());
  },
  createDocument: async (title, folderId) => {
    const userId = get().userId;
    const now = nowIso();
    const doc: Document = {
      id: nanoid(),
      userId,
      folderId,
      title,
      contentMd: "# 新文档 / New document",
      contentHtml: "",
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      documents: [doc, ...state.documents],
      activeDocId: doc.id,
      activeFolderId: folderId,
    }));
    await localDb.put("documents", doc);
    scheduleSync(() => get().syncNow());
  },
  updateDocument: async (docId, patch) => {
    const now = nowIso();
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === docId ? { ...doc, ...patch, updatedAt: now } : doc,
      ),
    }));
    const doc = get().documents.find((item) => item.id === docId);
    if (doc) await localDb.put("documents", doc);
    scheduleSync(() => get().syncNow());
  },
  deleteDocument: async (docId) => {
    const { versions, shares } = get();
    const remainingVersions = versions.filter(
      (version) => version.documentId !== docId,
    );
    const remainingShares = shares.filter(
      (share) => share.documentId !== docId,
    );
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== docId),
      versions: remainingVersions,
      shares: remainingShares,
      activeDocId:
        state.activeDocId === docId
          ? (state.documents.find((doc) => doc.id !== docId)?.id ?? null)
          : state.activeDocId,
    }));
    await localDb.remove("documents", docId);
    await Promise.all([
      ...versions
        .filter((version) => version.documentId === docId)
        .map((version) => localDb.remove("versions", version.id)),
      ...shares
        .filter((share) => share.documentId === docId)
        .map((share) => localDb.remove("shares", share.id)),
    ]);
    scheduleSync(() => get().syncNow());
  },
  saveVersion: async (docId) => {
    const doc = get().documents.find((item) => item.id === docId);
    if (!doc) return;
    const docVersions = get().versions.filter(
      (version) => version.documentId === docId,
    );
    const version: DocVersion = {
      id: nanoid(),
      documentId: docId,
      versionNo: docVersions.length + 1,
      contentMd: doc.contentMd,
      createdAt: nowIso(),
    };
    set((state) => ({ versions: [version, ...state.versions] }));
    await localDb.put("versions", version);
    scheduleSync(() => get().syncNow());
  },
  restoreVersion: async (versionId) => {
    const version = get().versions.find((item) => item.id === versionId);
    if (!version) return;
    await get().updateDocument(version.documentId, {
      contentMd: version.contentMd,
      contentHtml: "",
    });
  },
  addTag: async (docId, tag) => {
    const doc = get().documents.find((item) => item.id === docId);
    if (!doc || doc.tags.includes(tag)) return;
    await get().updateDocument(docId, { tags: [...doc.tags, tag] });
  },
  removeTag: async (docId, tag) => {
    const doc = get().documents.find((item) => item.id === docId);
    if (!doc) return;
    await get().updateDocument(docId, {
      tags: doc.tags.filter((item) => item !== tag),
    });
  },
  createShare: async (docId) => {
    const share: Share = {
      id: nanoid(),
      documentId: docId,
      token: nanoid(12),
      mode: "read",
      createdAt: nowIso(),
      expiresAt: null,
    };
    set((state) => ({ shares: [share, ...state.shares] }));
    await localDb.put("shares", share);
    scheduleSync(() => get().syncNow());
    return share;
  },
  deleteShare: async (shareId) => {
    set((state) => ({
      shares: state.shares.filter((share) => share.id !== shareId),
    }));
    await localDb.remove("shares", shareId);
    scheduleSync(() => get().syncNow());
  },
  applyRemoteDoc: async (doc) => {
    set((state) => ({
      documents: state.documents.some((item) => item.id === doc.id)
        ? state.documents.map((item) => (item.id === doc.id ? doc : item))
        : [doc, ...state.documents],
    }));
    await localDb.put("documents", doc);
  },
  removeRemoteDoc: async (docId) => {
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== docId),
      activeDocId:
        state.activeDocId === docId
          ? (state.documents.find((doc) => doc.id !== docId)?.id ?? null)
          : state.activeDocId,
    }));
    await localDb.remove("documents", docId);
  },
  applyRemoteFolder: async (folder) => {
    set((state) => ({
      folders: state.folders.some((item) => item.id === folder.id)
        ? state.folders.map((item) => (item.id === folder.id ? folder : item))
        : [...state.folders, folder],
    }));
    await localDb.put("folders", folder);
  },
  removeRemoteFolder: async (folderId) => {
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== folderId),
      activeFolderId:
        state.activeFolderId === folderId ? null : state.activeFolderId,
    }));
    await localDb.remove("folders", folderId);
  },
  syncNow: async () => {
    const { userId, folders, documents, shares, versions } = get();
    if (!isSupabaseConfigured) return;
    set({ syncStatus: "syncing", syncError: null });
    try {
      const remote = await pullRemoteData(userId);
      const merged = mergeRemote(folders, documents, shares, versions, remote);
      await Promise.all([
        localDb.bulkPut("folders", merged.folders),
        localDb.bulkPut("documents", merged.documents),
        localDb.bulkPut("shares", merged.shares),
        localDb.bulkPut("versions", merged.versions),
      ]);
      set({
        folders: merged.folders,
        documents: merged.documents,
        shares: merged.shares,
        versions: merged.versions,
        syncStatus: "idle",
      });
      await pushRemoteData(
        userId,
        merged.folders,
        merged.documents,
        merged.shares,
        merged.versions,
      );
    } catch (error) {
      set({
        syncStatus: "error",
        syncError: error instanceof Error ? error.message : "Sync failed",
      });
    }
  },
}));
