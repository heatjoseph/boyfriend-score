# 男友每日打分系统（Supabase 云端版）

当前版本已升级为云端存储，支持跨设备同步，并实现角色权限：

- 女友账号：可提交/修改/清空自己的评分数据
- 你账号：仅可查看全部评分，不可写入

## 1. Supabase 初始化

1. 创建 Supabase 项目（<https://supabase.com>）。
2. 打开 SQL Editor，执行下面整段 SQL。

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('girlfriend', 'boyfriend'))
);

create table if not exists public.daily_scores (
  id bigint generated always as identity primary key,
  score_date date not null,
  communication int not null check (communication between 0 and 20),
  care int not null check (care between 0 and 20),
  responsibility int not null check (responsibility between 0 and 20),
  romance int not null check (romance between 0 and 20),
  stability int not null check (stability between 0 and 20),
  comment text default '',
  total int not null check (total between 0 and 100),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (score_date, created_by)
);

alter table public.profiles enable row level security;
alter table public.daily_scores enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "girlfriend_select_own_scores" on public.daily_scores;
create policy "girlfriend_select_own_scores"
on public.daily_scores
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'girlfriend'
  )
  and created_by = auth.uid()
);

drop policy if exists "girlfriend_insert_own_scores" on public.daily_scores;
create policy "girlfriend_insert_own_scores"
on public.daily_scores
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'girlfriend'
  )
  and created_by = auth.uid()
);

drop policy if exists "girlfriend_update_own_scores" on public.daily_scores;
create policy "girlfriend_update_own_scores"
on public.daily_scores
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'girlfriend'
  )
  and created_by = auth.uid()
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'girlfriend'
  )
  and created_by = auth.uid()
);

drop policy if exists "girlfriend_delete_own_scores" on public.daily_scores;
create policy "girlfriend_delete_own_scores"
on public.daily_scores
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'girlfriend'
  )
  and created_by = auth.uid()
);

drop policy if exists "boyfriend_select_all_scores" on public.daily_scores;
create policy "boyfriend_select_all_scores"
on public.daily_scores
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'boyfriend'
  )
);
```

## 2. 创建账号与角色

1. 在 Supabase Console -> Authentication -> Users 中创建两个用户：
   - 女友邮箱账号
   - 你的邮箱账号
2. 在 Table Editor -> `profiles` 表新增两行：
   - `id = 女友用户UUID`, `role = girlfriend`
   - `id = 你的用户UUID`, `role = boyfriend`

## 3. 配置前端密钥

打开 `script.js`，把下面两个占位符替换成你自己的值：

```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

值来源：Supabase Console -> Project Settings -> API。

## 4. 本地运行

```bash
cd "/Users/josephzhang/男友打分系统"
python3 -m http.server 8080
```

访问 <http://localhost:8080>。

## 5. 部署到 Vercel

1. 将项目上传到 GitHub 仓库。
2. 登录 <https://vercel.com> 并导入该仓库。
3. 静态项目保持默认配置直接 Deploy。
4. 访问 `https://xxx.vercel.app`，分别用两个账号登录验证权限。

## 6. 验收检查

- 女友账号：可以保存、更新、清空自己的记录。
- 你账号：可以查看统计和历史，提交按钮应禁用。
- 两端不同设备登录后，看到同一份云端数据。
