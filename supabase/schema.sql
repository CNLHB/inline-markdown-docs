-- Inkline Markdown Workspace schema for Supabase

create table if not exists folders (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id text references folders (id) on delete set null,
  name text not null,
  sort_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id text references folders (id) on delete set null,
  title text not null,
  content_md text,
  content_html text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists doc_versions (
  id text primary key,
  document_id text not null references documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version_no integer not null,
  content_md text not null,
  created_at timestamptz not null default now()
);

create table if not exists shares (
  id text primary key,
  document_id text not null references documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  mode text not null check (mode in ('read', 'write')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists folders_user_id_idx on folders (user_id);
create index if not exists documents_user_id_idx on documents (user_id);
create index if not exists documents_updated_at_idx on documents (updated_at);
create index if not exists shares_token_idx on shares (token);
create index if not exists doc_versions_doc_id_idx on doc_versions (document_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists folders_set_updated_at on folders;
create trigger folders_set_updated_at
before update on folders
for each row execute procedure set_updated_at();

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at
before update on documents
for each row execute procedure set_updated_at();

alter table folders enable row level security;
alter table documents enable row level security;
alter table doc_versions enable row level security;
alter table shares enable row level security;

create policy "Users manage their folders"
on folders
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their documents"
on documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their versions"
on doc_versions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their shares"
on shares
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Public read for share links via a security definer function
create or replace function get_shared_document(share_token text)
returns table (
  id text,
  title text,
  content_md text,
  content_html text,
  updated_at timestamptz
)
language sql
security definer
as $$
  select d.id, d.title, d.content_md, d.content_html, d.updated_at
  from documents d
  join shares s on s.document_id = d.id
  where s.token = share_token
    and (s.expires_at is null or s.expires_at > now())
    and s.mode = 'read'
  limit 1;
$$;

alter function get_shared_document(text) set search_path = public;

grant execute on function get_shared_document(text) to anon;
