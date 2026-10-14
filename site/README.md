# site/ — 数字 IC 后端知识库 Astro 项目

> 这是基于 Astro 5.x 的站点项目，把 `../backend-kb/` 下的 Markdown 内容渲染成完整的、可部署的静态网站。

## 📂 目录结构

```
site/
├── public/             # 静态资源（favicon、robots.txt、og-image）
├── src/
│   ├── components/     # 可复用组件
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Sidebar.astro
│   │   ├── TOC.astro
│   │   ├── Card.astro
│   │   └── SearchBox.astro
│   ├── content/        # Markdown 内容（由脚本迁移）
│   │   └── docs/
│   │       ├── basics/
│   │       ├── interview/
│   │       └── ...
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── DocsLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── [module]/index.astro      # 6 个模块列表页
│   │   ├── docs/[...slug].astro      # 文章详情
│   │   ├── about.astro
│   │   ├── contributing.astro
│   │   ├── 404.astro
│   │   └── rss.xml.js
│   ├── styles/global.css
│   └── content.config.ts
├── scripts/
│   └── migrate-content.mjs            # Markdown 迁移脚本
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

## 🚀 快速开始

### 安装依赖

```bash
cd site
npm install
```

### 内容迁移（修改 backend-kb 后必跑）

```bash
node scripts/migrate-content.mjs
```

### 启动开发服务器

```bash
npm run dev
# → http://localhost:4321
```

### 构建生产版本

```bash
npm run build
# 输出到 dist/
```

### 预览生产版本

```bash
npm run preview
# → http://localhost:4321
```

## 🚢 部署

### 方案 A：EdgeOne Pages（国内推荐，0 成本）

1. 把 `backend-kb/` 推到 GitHub
2. 访问 https://edgeone.ai/pages
3. 关联 GitHub 仓库
4. 配置：
   - **构建命令**：`cd site && npm install && npm run build`
   - **构建输出目录**：`site/dist`
   - **Node 版本**：22
5. 每次 push 自动部署

### 方案 B：Vercel

```bash
npm install -g vercel
cd site
vercel --prod
```

或在 Vercel Dashboard 关联 GitHub 仓库，配置同方案 A。

### 方案 C：GitHub Pages

```bash
# 在仓库根添加 .github/workflows/deploy.yml
```

## 🎨 自定义

### 修改主题色

`tailwind.config.mjs`：

```js
theme: {
  extend: {
    colors: {
      primary: { ... }, // 改成你的品牌色
    }
  }
}
```

### 添加新模块

1. `src/content.config.ts` 的 `enum` 添加新值
2. `[module]/index.astro` 的 `getStaticPaths` 添加新值
3. `Sidebar.astro` 的 `MODULE_NAV` 添加新值
4. `MODULE_META` 同步添加
5. `backend-kb/` 下新建 `07-xxx/` 目录
6. 跑 `node scripts/migrate-content.mjs`

## 📊 性能优化

- ✅ Astro 默认零 JS，仅交互组件才加载 JS
- ✅ Tailwind JIT 编译，删除未用样式
- ✅ Pagefind 静态搜索（无需服务端）
- ✅ Shiki 高亮（构建时渲染，无需客户端 JS）
- ✅ 自动生成 sitemap.xml 和 rss.xml

## 🐛 故障排查

### Markdown 不显示

```bash
# 检查 frontmatter 是否被正确添加
cat src/content/docs/basics/01-静态时序分析STA.md | head -5
```

### 样式没生效

```bash
# 清除缓存重新构建
rm -rf .astro dist
npm run dev
```

### 搜索不可用

```bash
# Pagefind 索引在 build 时生成
npm run build
# 然后 npm run preview 检查
```

## 📜 License

CC BY-NC-SA 4.0
> 🚀 部署测试：本站由 GitHub + Netlify 自动部署，每次 push 到 site/ 目录的改动会自动上线。
