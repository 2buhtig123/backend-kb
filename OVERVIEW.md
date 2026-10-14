# 数字 IC 后端求职知识库 — 任务总结

> 本次任务的最终交付概览。详细方案见对话历史，关键决策见下方。

## ✅ 已完成内容

### 1. 项目框架
- **README.md**：站点定位、目标受众、内容地图、3-6 个月学习路线图、维护机制、贡献指南

### 2. 基础知识（6 篇，约 2.8 万字） — **后端工程师"六件套"齐了**
- `01-基础知识/01-静态时序分析STA.md` — 时序灵魂，覆盖建立/保持时间、OCV/CPPR/AOCV/POCV、时序例外、Mode × Corner
- `01-基础知识/02-时钟树综合CTS.md` — H-Tree/Fishbone/Mesh、Useful Skew、CPPR、Clock Gating
- `01-基础知识/03-CMOS数字电路基础.md` — 反相器、功耗基础、亚稳态、SPEF 寄生
- `01-基础知识/04-布局布线PNR.md` — Floorplan → Placement → CTS → Routing → Optimization 全流程，MMMC、ECO、工具链 ⭐v0.1 新增
- `01-基础知识/05-物理验证PV.md` — DRC/LVS/ERC + 天线效应 + 闩锁 + ESD + Sign-off 文档清单 ⭐v0.1 新增
- `01-基础知识/06-低功耗设计UPF.md` — UPF 三大件（Power Gating / Isolation / Retention）+ Level Shifter + DVFS + Vt Swap + MTCMOS ⭐v0.1 新增

### 3. 八股题库（2 专题，15 道题）
- `02-八股题库/01-时序专题.md` — 10 道精选题，含公式推导、修复策略、实战案例
- `02-八股题库/02-跨时钟域CDC.md` — 5 道必考题：亚稳态、同步器、格雷码、异步 FIFO 深度、CDC 检查清单

### 4. 秋招汇总（1 篇，10 家公司）
- `03-秋招汇总/01-头部公司秋招汇总.md` — 海思、联发科、NVIDIA、AMD、EDA 三巨头、AI 芯片公司等的时间线、流程、薪资、考察重点

### 5. 站点框架 ⭐v0.2 新增

**技术栈**：Astro 5.x + Tailwind CSS 3.x + Pagefind 搜索 + Shiki 代码高亮

```
backend-kb/
├── 📚 01-基础知识/          # 内容源（Markdown）
├── 📝 02-八股题库/
├── 🍂 03-秋招汇总/
├── 💼 04-社招汇总/         # 空
├── 🎯 05-实习汇总/         # 空
├── 🛠 06-工具资源/         # 空
├── 📄 README.md            # 含部署说明
├── 📄 OVERVIEW.md          # 本文档
├── 🌐 site/                # Astro 站点项目
│   ├── src/                # 源代码
│   │   ├── components/     # 6 个组件（Header/Footer/Sidebar/TOC/Card/SearchBox）
│   │   ├── layouts/        # BaseLayout / DocsLayout
│   │   ├── pages/          # 8 个页面（含动态路由）
│   │   ├── content/        # Content Collections
│   │   └── styles/         # Tailwind + 自定义样式
│   ├── scripts/            # migrate-content.mjs
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   └── package.json
└── 🚀 .github/workflows/   # GitHub Pages 自动部署
```

**部署选项**：
- **EdgeOne Pages**（国内推荐，0 成本）
- **Vercel**（海外首选）
- **GitHub Pages**（自动 Action 已配置）

**当前状态**：
- ✅ Build 通过（19 个静态页面、~1.5MB dist）
- ✅ Pagefind 索引生成成功（2634 词）
- ✅ 暗色模式 / 搜索 / TOC / 移动端适配
- ⏳ 待用户手动推到 GitHub → 部署上线

### 6. 部署资产 ⭐v0.3 新增

```
backend-kb/
├── 📄 DEPLOY.md                # 4 条部署路径总览
├── 📄 EDGEONE.md               ⭐ 路径 A 详细步骤（截图级）
├── 📄 GITHUB.md                # Git 推送与 GitHub Pages 配置
├── 🔧 push-to-github.sh        # 一键推送脚本（bash / Git Bash）
├── 🔧 rebuild-zip.ps1          ⭐ 重建部署包（Windows / PowerShell）
├── 📦 site/deploy-ready.zip    # 460KB 部署包（拖到 EdgeOne/Pages 即可）
├── 📦 site/dist.tar.gz          # Linux 习惯的 tar.gz
└── 🚀 site/dist/               # 完整静态站点（19 HTML + Pagefind）
```

**💡 推荐路径 A：EdgeOne Pages（1 分钟）**
详细步骤见 [EDGEONE.md](./EDGEONE.md)

## 🚀 上线路径（v0.3 已就绪，最快 1 分钟上线）

| 路径 | 难度 | 速度 | 国内访问 | 推荐 |
|---|---|---|---|---|
| **A. EdgeOne Pages**（拖入 zip） | ⭐ 极简 | 1-3 分钟 | 快 ✅ | ⭐⭐⭐⭐⭐ |
| **B. Vercel**（拖入 dist/） | ⭐ 极简 | 30 秒 | 中等 ⚠️ | ⭐⭐⭐⭐ |
| **C. GitHub Pages**（git push + Action） | ⭐⭐⭐ 需 git 配置 | 2-5 分钟 | 慢 ⚠️ | ⭐⭐⭐⭐ |
| **D. 本地预览** | 0 | 0 | — | — |

**最简方式：把 `site/deploy-ready.zip` 直接拖到 https://console.cloud.tencent.com/edgeone/pages → 创建项目 → 上传部署**，1 分钟上线免费。

**自动部署方式**：
```bash
cd backend-kb
bash push-to-github.sh git@github.com:YOUR_NAME/backend-kb.git
```
然后 GitHub → Settings → Pages → Source 选 "GitHub Actions"，自动构建部署。

详见 [DEPLOY.md](./DEPLOY.md) 和 [GITHUB.md](./GITHUB.md)。

---

## 🎯 关键决策

| 决策项 | 选择 |
|---|---|
| 方向 | **数字 IC 后端（PD/CTS/PV）** |
| 定位 | **公开知识库** |
| 开发策略 | **内容先行 → 框架后搭** |
| 分发渠道 | **网站为主**（公众号/小红书后续可选） |
| 站点技术栈 | **Astro 5.x + Tailwind 3.x + Pagefind** ⭐v0.2 |
| 推荐部署平台 | **EdgeOne Pages（国内）/ Vercel（海外）** ⭐v0.2 |
| 内容 License | CC BY-NC-SA 4.0 |

## 📋 后续工作（用户审阅后启动）

1. ✅ 基础知识补充：PNR、Low Power、PV（v0.1 完成）
2. ⏳ 八股题库补充：面积/拥塞、功耗/IR Drop、SI、DFT、工具脚本（5 专题）
3. ⏳ 实习 / 社招汇总：与秋招汇总同结构
4. ⏳ 工具资源：脚本、书单、博客推荐
5. ✅ 站点框架搭建（v0.2 完成）
6. ⏳ 公众号 / 小红书分发（可选）

## ⚠️ 内容时效性

本文档基于 **2025-2026 秋招** 情况撰写，建议每年 5-6 月更新一次招聘信息。
---

## 🆕 v0.10 — GitHub 推送准备（10/14）

| 任务 | 状态 |
|---|---|
| `.gitignore`（合并 site/.gitignore + 部署包） | ✅ 已创建 |
| `.gitattributes`（CRLF/LF 自动转换） | ✅ 已创建 |
| `push-to-github.sh`（升级版，含颜色 + 错误提示 + 验证流程） | ✅ 已重写（语法测试通过） |
| `GITHUB.md`（推送指南 + HTTPS/SSH 选择 + 排错） | ✅ 已重写 |
| `README.md`（仓库版，目录结构 + 维护指南） | ✅ 已重写 |
| `.github/workflows/deploy.yml`（路径从 backend-kb/site → site） | ✅ 已修正 |
| `git init` 试跑 + dry-run 统计 | ✅ 87 文件待 push / 7 个被忽略 |

**仓库规格**：
- 总大小：3.3MB（不含 node_modules / dist）
- 待 push：87 文件 / 24 篇 markdown
- 推荐仓库名：`backend-kb`
- 推荐可见性：**Public**（个人作品集 + 求职加分）
