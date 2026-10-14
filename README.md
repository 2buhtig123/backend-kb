# 数字 IC 后端求职知识库

> 面向数字 IC 后端（Physical Design / STA / Sign-off）工程师的求职知识库。
> 内容覆盖：基础知识、八股题库、秋招/实习/社招汇总、工具资源。

🌐 **在线站点**：<https://ic-backend-kb.netlify.app>

---

## 📊 数据快照

| 维度 | 数值 |
|---|---|
| 基础知识 | 12 篇（入门 6 + 进阶 6） |
| 八股题库 | 7 大专题（50+ 道高频题） |
| 求职汇总 | 秋招 + 实习 + 社招 |
| 工具资源 | 书单大全 + 扩展指南 |
| 文章总数 | 24 篇 |
| 总字数 | 约 9 万字 |
| 技术栈 | Astro 5 + Tailwind 3 + Pagefind |
| 部署 | EdgeOne Pages + Netlify Drop + GitHub Pages 三套 |

---

## 🚀 一键部署/查看

- **本地预览**：`cd site && npm install && npm run dev` → `http://localhost:4321`
- **生产构建**：`cd site && npm run build` → `site/dist/`
- **Netlify Drop**：`site/dist/` 整个文件夹拖进 <https://app.netlify.com/drop>
- **EdgeOne Pages**：详见 `EDGEONE.md`
- **GitHub Pages**：详见 `.github/workflows/deploy.yml`（推 main 自动部署）

---

## 📂 目录结构

```
backend-kb/
├── README.md                        # 你正在看
├── OVERVIEW.md                      # 任务交付总览
├── DEPLOY.md                        # 部署路径说明
├── EDGEONE.md                       # EdgeOne Pages 详细部署
├── GITHUB.md                        # GitHub 推送 + GitHub Pages
├── push-to-github.sh                # 一键推送脚本
├── rebuild-zip.ps1                  # 一键重建 + 打包
│
├── 01-基础知识/                     # 12 篇（基础 6 + 进阶 6）
│   ├── 01-静态时序分析STA.md
│   ├── 02-时钟树综合CTS.md
│   ├── 03-CMOS数字电路基础.md
│   ├── 04-布局布线PNR.md
│   ├── 05-物理验证PV.md
│   ├── 06-低功耗设计UPF.md
│   ├── 07-STA进阶篇.md
│   ├── 08-MMMC详解.md
│   ├── 09-ECO流程.md
│   ├── 10-Signoff综合.md
│   ├── 11-DFT进阶篇.md
│   └── 12-Tcl实战篇.md
│
├── 02-八股题库/                     # 7 大专题
│   ├── 01-时序专题.md
│   ├── 02-跨时钟域CDC.md
│   ├── 03-面积与拥塞.md
│   ├── 04-功耗与IRDrop.md
│   ├── 05-信号完整性SI.md
│   ├── 06-可测试性设计DFT.md
│   └── 07-工具脚本与命令.md
│
├── 03-秋招汇总/01-头部公司秋招汇总.md
├── 04-社招汇总/01-社招跳槽指南.md
├── 05-实习汇总/01-头部公司实习清单.md
│
├── 06-工具资源/
│   ├── 01-后端工程师书单与资源大全.md
│   └── 02-知识地图与扩展指南.md
│
├── site/                            # Astro 站点源码
│   ├── astro.config.mjs
│   ├── package.json
│   ├── tailwind.config.mjs
│   ├── src/
│   │   ├── content/docs/            # 自动迁移自上面 Markdown
│   │   ├── components/
│   │   ├── layouts/
│   │   └── pages/
│   ├── scripts/migrate-content.mjs  # 内容迁移脚本
│   └── public/
│
└── .github/workflows/deploy.yml     # GitHub Pages 自动部署
```

---

## ✍️ 维护方式

### 改内容

直接编辑 `01-基础知识/*.md` 或 `02-八股题库/*.md` 等文件，然后：

```bash
cd site
node scripts/migrate-content.mjs   # 把 Markdown 迁移到 site/src/content/docs/
ASTRO_TELEMETRY_DISABLED=1 npm run build   # 重建 dist/
```

### 部署更新

- **Netlify**：把新 `site/dist/` 整个文件夹拖到 Netlify 后台
- **GitHub Pages**：直接 `git push`，自动部署
- **本地预览**：`cd site && npm run dev`

### 一键打包（Windows）

```powershell
cd backend-kb
.\rebuild-zip.ps1
```

会自动跑 `npm run build` + 打成 `deploy-ready.zip`（可直接拖 Netlify）。

---

## 🤝 贡献

欢迎提 Issue / PR 补充：
- 八股错题纠正
- 新增公司秋招信息（记得脱敏）
- 新八股题或公司案例

---

## 📜 许可

MIT License - 你可以自由复用、修改、商用。

---

## 🌟 Star History

如果这个知识库对你的秋招有帮助，欢迎 Star ⭐，这是最大的支持。
> 🚀 本站由 GitHub + Netlify 自动部署，每次 push 自动更新。

> 🚀 本站由 GitHub + Netlify 自动部署，每次 push 自动更新。
