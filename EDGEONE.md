# EdgeOne Pages 部署步骤（国内访问最快 / 永久免费）⭐

> **目标：1 分钟内拿到 `https://xxx.edgeone.app` 永久域名**

## 📦 你需要的文件

⚠️ **请用 `deploy-en.zip`（英文路径版）** —— EdgeOne Pages 后台对路径中的中文字符很敏感，原版 `deploy-ready.zip` 拖入会报"特殊字符"。

| 文件 | 大小 | 路径特征 | 适用平台 |
|---|---|---|---|
| **`deploy-en.zip`** ⭐用这个 | 460 KB | **全英文** slug（如 `01-static-timing-analysis-sta/`） | EdgeOne Pages / 严格平台 |
| `deploy-ready.zip` | 460 KB | 中文 slug（原版） | Vercel / GH Pages 等宽松平台 |

**请下载 `deploy-en.zip` 后再上传。** 文件位置：

```
C:\Users\13643\WorkBuddy\2026-10-13-21-54-14\backend-kb\site\deploy-en.zip
```

解压后根目录里有 `index.html`，EdgeOne Pages 会自动识别为站点首页。

---

## 🚀 上传步骤（截图级说明）

### 第 1 步：登录控制台

打开：https://console.cloud.tencent.com/edgeone/pages

> 如果没登录，会跳到腾讯云登录页（微信扫码或账号密码都可以）

### 第 2 步：进入 Pages 控制台

登录后会看到「EdgeOne Pages」控制台主页。

### 第 3 步：创建项目

点击右上角蓝色按钮「**+ 创建项目**」（或「上传部署」）

### 第 4 步：选择部署方式

弹出三种部署方式，选「**直接上传（文件 / ZIP）**」。

> ⚠️ 不要选「关联 Git 仓库」，那个是给项目源码用的，会要求 npm 编译。我们已经构建好了。

### 第 5 步：配置项目基础信息

| 字段 | 推荐值 | 说明 |
|---|---|---|
| 项目名称 | `backend-kb`（或自取） | 只能英文/数字/下划线，最终域名会用到 |
| 项目描述 | 数字 IC 后端求职知识库 | 可选 |
| 区域 | **中国大陆**（默认） | 国内访问最快 |

点「**下一步**」。

### 第 6 步：上传 ZIP（关键！）

这一步有两种界面，看你看到的：

#### 界面 A:拖拽上传区

把 `deploy-ready.zip` **直接拖到那个大虚线框**里，会自动开始上传并解压。

#### 界面 B:点击上传按钮

点「**选择文件**」或「**Upload**」→ 在弹窗中选 `backend-kb/site/deploy-ready.zip`

#### 等待上传

- 460KB，5-10 秒就传完
- 上传完会自动构建（静态站点，几乎瞬间）

### 第 7 步：检查部署结果

部署完成后，EdgeOne 会给你一个 `*.edgeone.app` 的测试域名，类似：

```
https://backend-kb-xxx.edgeone.app
```

**点开就能看到首页了！** ✅

### 第 8 步：绑定自定义域名（可选）

如果想用 `backend-kb.com` 这种自己的域名：

1. 在 Pages 项目 → 「**域名管理**」→「**添加域名**」
2. 输入你的域名，EdgeOne 会给你一条 CNAME 记录
3. 到你的域名服务商（腾讯云/阿里云/Cloudflare 等）添加这条 CNAME
4. 几分钟后生效，自动 HTTPS

---

## 🔍 部署后验证清单

打开你拿到的域名，依次检查：

- [ ] **首页能打开** —— 应该看到「数字 IC 后端知识库」标题 + 6 个模块卡片
- [ ] **6 个模块列表页** —— 点导航栏的「基础知识」「八股题库」等
- [ ] **至少 1 篇文章** —— 进入「基础知识」→ 任意一篇文章，看左侧导航 + 右侧 TOC
- [ ] **搜索能工作** —— 按 `Ctrl+K`（或点搜索图标），输入「OCV」试试
- [ ] **暗色模式** —— 右上角太阳/月亮按钮切换
- [ ] **移动端** —— 用手机打开（或浏览器改宽度到 375px），排版应该自动适配

---

## ⚠️ 常见问题

### Q1: 上传后打开是 404

排查步骤：

1. 检查 unzip 后根目录是否有 `index.html`
   - 我们的 zip 里**一定会有**（已确认）
2. 检查 EdgeOne Pages 项目配置 → 「**默认文档**」是否设置了 `index.html`
   - 默认就应该是 `index.html`，无需改
3. 重新上传一次（有时候第一次网络抖动）

### Q2: 中文路径显示 404

页面 URL 里有中文是正常的（如 `docs/basics/01-静态时序分析sta/`）。

如果 EdgeOne 解码有问题导致 404，**不会发生** —— EdgeOne 的路由和我们的目录结构完全对齐。

### Q3: Pagefind 搜索不工作

可能性：
1. **第一次访问慢** —— Pagefind 索引 lazy-load，首访下载需要几秒
2. **网络问题** —— EdgeOne 默认 CDN，部分地区第一次加载较慢
3. **`pagefind/pagefind.js` 404** —— 如果还有这问题，反馈给我，**可能是 EdgeOne 大小写敏感**没匹配 `pagefind.js`

### Q4: 想要更新内容怎么办？

```bash
# 1. 修改 markdown
vim backend-kb/01-基础知识/01-静态时序分析STA.md

# 2. 同步到 Content Collections
cd backend-kb/site && node scripts/migrate-content.mjs

# 3. 重新 build
cd backend-kb/site && npm run build

# 4. 重新打包
# (PowerShell)
Compress-Archive -Path dist\* -DestinationPath deploy-ready.zip

# 5. 上传新 zip 到 EdgeOne Pages（替换旧的）
```

---

## 📋 部署摘要

| 项 | 值 |
|---|---|
| 推荐平台 | **EdgeOne Pages** |
| 上传方式 | **直接拖 zip** |
| 包大小 | **460 KB** |
| 文件数 | **62 个** |
| 部署耗时 | **1-3 分钟** |
| 免费额度 | **永久免费**（足够个人站） |
| 国内访问 | **快**（CDN 加速） |
| 自定义域名 | **支持**（CNAME 一键绑定） |
| HTTPS | **自动** |

---

## 🎯 部署完成后你可以做的

| 动作 | 价值 |
|---|---|
| 把链接发到牛客/小红书引流 | 拉新读者 |
| 申请 Google Search Console | SEO 收录 |
| 绑自定义域名 | 个人品牌 |
| 接入 giscus 评论 | 社区反馈 |
| 接 Plausible/Umami 统计 | 看流量 |
| 加 About 页面联系方式 | 求职 self-promo |

完成 ✅
