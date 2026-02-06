# Inkline Markdown Workspace / Inkline Markdown 工作区

一个具备文件夹管理、WYSIWYG + 源码编辑、实时预览、标签/搜索、分享与导出，并支持 Supabase 同步的在线 Markdown 编辑器。

An online Markdown editor with foldered document management, WYSIWYG + source modes, live preview, tagging, sharing, export, and Supabase sync.

## 功能特性 / Features
- 文件夹树层级管理，支持移动/重命名/删除
- 文档 CRUD 与版本历史
- WYSIWYG 编辑 + Markdown 源码模式
- 实时预览与全文搜索
- 标签、分享链接、HTML/PDF 导出
- 本地 IndexedDB 存储 + Supabase 云端同步

- Folder tree with nested structure, move/rename/delete
- Document CRUD with version history
- WYSIWYG editor + Markdown source mode
- Live preview and full-text search
- Tags, share links, HTML/PDF export
- Local IndexedDB storage and Supabase sync

默认语言为中文，可在界面右上角切换语言 / Default language is Chinese; switch in the top-right selector.

## 快速开始 / Quick start
```bash
npm install
npm run dev
```

## Supabase 配置 / Supabase setup
1. 创建一个 Supabase 项目 / Create a Supabase project.
2. 在 SQL Editor 运行 `supabase/schema.sql`.
3. 创建名为 `assets` 的公开存储桶（或在 `src/components/EditorPane.tsx` 修改桶名）。
4. 在项目根目录创建 `.env`:
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

分享页面通过 `get_shared_document` SQL 函数读取文档 / The share view calls the `get_shared_document` SQL function defined in the schema.

Storage tip: set the `assets` bucket to public and allow authenticated users to upload files.

环境变量未配置时将以本地模式运行 / The app will run in local-only mode if the environment variables are not set.
