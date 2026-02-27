# 男友每日打分系统

一个轻量网页：每天可按 5 个维度给男友评分（总分 100），支持历史记录、统计看板、数据导出。

## 功能

- 每日评分（同一天重复提交会覆盖更新）
- 历史记录表格
- 平均分 / 最高分 / 最低分 / 记录天数
- 导出 JSON 备份
- 一键清空数据

## 本地预览

直接双击 `index.html` 即可打开，或在终端运行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 上线（推荐 Vercel）

### 方案 A：网页控制台（不用命令行）

1. 打开 [https://vercel.com](https://vercel.com)，使用 GitHub 登录。
2. 把本项目上传到一个 GitHub 仓库（可新建仓库）。
3. 在 Vercel 里点 `Add New Project`，选择该仓库导入。
4. 框架选 `Other`（或保持默认），Build 命令留空，Output 目录留空。
5. 点击 Deploy，几分钟后得到可访问链接（如 `https://xxx.vercel.app`）。

### 方案 B：命令行

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

按提示选择当前目录即可。

## 上线（备选 Netlify）

1. 打开 [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. 把项目文件夹直接拖进去
3. 几秒后拿到公开链接

## 说明

当前版本使用浏览器 `localStorage` 存数据，适合“一个设备长期记录”的场景。

如果你希望：

- 你女朋友手机打分、你手机也能同步看
- 仅她可写，你可查看
- 微信分享后多人访问也稳定

下一步可以升级为“前端 + 云数据库（Supabase/Firebase）”版本。
