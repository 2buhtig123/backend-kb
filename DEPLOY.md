# 部署指南 / Deployment Guide

> 数字 IC 后端知识库 - 静态站点 v0.2

本目录可作为静态站点直接部署。所有产物已在 `dist/` 中，结构清晰、零依赖。

## 关键文件

| 文件 | 用途 |
|---|---|
| `dist/` | **可直接部署的静态站点**（19 个页面 + Pagefind 搜索索引） |
| `deploy-ready.zip` | dist 的压缩包，460KB，可直接上传到 EdgeOne Pages / Vercel |
| `dist.tar.gz` | 同上，Linux 习惯用 tar |
| `.github/workflows/deploy.yml` | GitHub Pages 自动部署配置（已就绪） |

## 路径 A:EdgeOne Pages（国内访问最快，推荐）⭐

EdgeOne Pages 是腾讯云的边缘函数静态托管，国内访问速度最佳，**完全免费额度**。

### 步骤

1. 打开 https://console.cloud.tencent.com/edgeone/pages （已连接器可直达）
2. 点击「**创建项目**」→「**上传部署**」
3. 上传方式选「**直接上传**」
4. 把项目信息填好:
   - 项目名:`backend-kb`（或自取）
   - 上传文件:**直接拖 `deploy-ready.zip` 进网页**

   或者进入「高级」→ 选择上传目录（你需要先把 zip 解压成 dist 文件夹然后上传整个 dist 文件夹）

5. 几秒钟后分配域名:`https://xxx.edgeone.app`
6. 完成 ✅

### 后续更新

每次重新 build 后:
```bash
cd site
npm run build   # 重新生成 dist
# 重新上传 dist 到 EdgeOne Pages 后台
```

## 路径 B:Vercel（海外访问最快，零配置）

1. 打开 https://vercel.com/new
2. 选 "Import Project" → "Deploy" → 拖入 dist/ 文件夹
3. 自动识别为静态站点,30 秒上线
4. 默认域名:`https://xxx.vercel.app`

**特别提醒:Vercel 会被国内网络部分屏蔽,适合海外用户访问。**

## 路径 C:GitHub Pages（自动部署 + 免费二级域名）

适合需要长期内容更新场景。每次 git push 后自动部署。

### 第一次

```bash
# 1. 在 GitHub 创建仓库 backend-kb（不要勾 README/.gitignore/license）
# 2. 本地关联并推送
cd backend-kb
git init
git add .
git commit -m "init: 数字 IC 后端知识库 v0.2"
git branch -M main
git remote add origin git@github.com:<your-name>/backend-kb.git
git push -u origin main

# 3. 在 GitHub 仓库 Settings → Pages → Source 选 "GitHub Actions"
# 4. 等 2-3 分钟,自动构建并部署到 https://<your-name>.github.io/backend-kb
```

### 后续更新

```bash
cd backend-kb
git add .
git commit -m "content: 新增 XXX 八股 5 题"
git push
# 自动重新部署
```

### 自定义域名

如果你有自己的域名,在 Settings → Pages → Custom domain 设置,然后去 Cloudflare 加 CNAME 即可。

## 路径 D:本地预览（不上线）

```bash
cd backend-kb/site
npm run dev
# 打开 http://localhost:4321
```

## ⚠️ 上线前注意事项

| 项 | 说明 |
|---|---|
| **URL 大小写** | Astro 默认小写 URL（sta 而非 STA），SEO 友好，无需处理 |
| **中文搜索** | Pagefind 默认无中文 stemming 但搜索仍然可用 |
| **GitHub Pages 路径** | 如果用 `<user>.github.io/backend-kb`，所有链接前会自动加 `backend-kb` 前缀，建议用 `<user>.github.io`（独立仓库名） |
| **CDN 缓存** | EdgeOne / Vercel 都会自动 CDN 化，更新可能有几分钟延迟 |
| **HTTPS** | 三个平台默认 HTTPS，无需配置 |

## 🎯 推荐组合

- **国内访问** → EdgeOne Pages（一级域名 + 国内 CDN + 零成本）
- **自动部署** → GitHub Pages（push 即更新）
- **海外用户** → 同时挂 Vercel（镜像，全球加速）
- **长期资产** → 拥有自己的域名 + Cloudflare（彻底掌控）

## 验证清单

上线后请检查:

- [ ] 首页能正常访问
- [ ] 6 个模块的列表页正常
- [ ] 至少 3 篇文章详情页可访问
- [ ] 顶部搜索框能用（按 `/` 或 `Ctrl+K` 试试）
- [ ] 暗色模式切换生效
- [ ] 移动端排版正常（手机访问）
- [ ] sitemap.xml 可访问（SEO 用）
- [ ] RSS 可访问（订阅器用）

完成 ✅ 后，你就有了一个**可被搜索引擎索引、可被分享链接、可绑定自己域名**的数字 IC 后端求职知识库站点。
