# 部署与 credits 管理

线上地址：https://ic-backend-kb.netlify.app

托管在 Netlify，接的是 GitHub 自动部署：push 到 `main` → Netlify 拉代码 → 构建 → 发布。仓库里的构建配置：

| 项 | 值 |
|---|---|
| Base directory | `site` |
| Build command | `npm run build`（`astro build && pagefind --site dist`） |
| Publish directory | `site/dist` |

---

## 一、Netlify credits 是什么

Netlify 从 2025 年 9 月起换成 credit 计费。新账号的 Free 套餐是 **300 credits/月，硬上限**，所有消耗都从这一个池里扣，不再有独立的「带宽额度」「构建分钟额度」。

| 消耗项 | 费率 |
|---|---|
| **生产部署（push 到 main 触发）** | **15 credits / 次** |
| 带宽 | 20 credits / GB |
| Web 请求 | 2 credits / 万次 |
| Compute（Functions 等，本站没用） | 10 credits / GB-hour |
| Deploy Preview、分支部署、表单提交 | 0 |
| 构建时长 | 不计费 |

两点容易误解：

- **构建时长不参与计费。** 部署 30 秒和 8 分钟一个价，都是 15 credits。所以「优化构建速度」省不了钱，「减少部署次数」才省钱。
- **只有成功的生产部署计入。** 构建失败、回滚到旧版本都不扣 credits。

额度用完的后果：**全站暂停**，访客看到 Site not available，直到下个计费周期重置。Free 计划没有自动续费，也不能单独买加量包，只能升级套餐（Personal $9/月，1000 credits）。

### 本站实际踩过的坑

2026-10-13 到 10-18 六天里推了 23 个提交，大致 15 次生产部署，`15 × 15 = 225`，正好用掉 75%。同期带宽几乎没消耗——整个 `site/dist` 只有 5.5 MB，1 GB 带宽相当于几千次页面访问。

**结论：钱全花在部署次数上。**

---

## 二、一条铁律：改完一批只推一次

同样这批内容，如果攒成 3 次发布，就是 45 credits，而不是 225。

所以发布节奏是：

```
改内容 → 本地验证 → 攒够一批 → 一次性推送
```

反例（之前就是这么干的，每次 15 credits）：

```
改一篇 → 推 → 发现漏了一处 → 再推 → 又想起来要补链接 → 又推
```

---

## 三、日常流程

### 1. 本地改、本地看（0 credits）

```bash
cd site
npm run dev          # http://localhost:4321，热更新
```

构建产物自检（发布前一定要跑）：

```bash
cd site
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm run preview      # 预览构建后的静态产物
```

### 2. 想在线上看效果：用分支部署（0 credits）

Deploy Preview 和分支部署都不计 credits，适合「让人看一眼」或者真机测试。

```bash
# 把当前工作推到远端分支，不碰 main
git push origin HEAD:draft
```

Netlify 会生成 `https://draft--ic-backend-kb.netlify.app` 这类预览地址。首次使用需要在 Netlify 后台开一次：

- **Branch deploys**：Site configuration → Build & deploy → Branches → 选 `All` 或指定分支
- 或者走 PR：Repo 里开 Pull Request，Netlify 默认给 PR 生成 Deploy Preview

### 3. 定稿发布（15 credits）

```bash
git checkout main
git merge draft
git push origin main     # 这一次才扣 credits
```

---

## 四、不触发构建的提交

只改了仓库里的文档、报告（`verify-*.md`、`review-*.md`、本文件），站点内容没动，不需要重新部署。在提交信息里加 `[skip netlify]`：

```bash
git commit -m "docs: 第 10 章核对报告留档 [skip netlify]"
```

Netlify 看到这个标记会直接跳过构建，不扣 credits。`[skip ci]` 效果相同。

---

## 五、月度预算参考

按 300 credits 算：

| 用途 | 额度 | 折算 |
|---|---|---|
| 生产部署 | 15 credits/次 | 20 次/月（如果全花在这上面） |
| 带宽 | 20 credits/GB | 15 GB/月 |
| Web 请求 | 2 credits/万次 | 150 万次/月 |

实际是混着花。给这个站的建议：

- **每月生产部署控制在 8-10 次以内**（120-150 credits）
- 留 100 credits 给带宽和请求（约 5 GB 流量，够几千到一万次访问）
- 大改版（比如批量加文章）算一次发布，不要拆成十次

如果某个月要做大规模内容更新，先在本地把全部内容写完、构建验证通过，再一次性推。

---

## 六、额度真不够时的备选

**Cloudflare Pages**：免费、带宽不限、每月 500 次构建，纯静态 Astro 站迁移成本很低——构建命令 `npm run build`，输出目录 `dist`，root 目录 `site`，其余不用改。

迁移动机只有一个：当月内容更新次数多到 300 credits 撑不住。如果只是日常维护，留在 Netlify 就行。

---

## 七、发布前检查清单

- [ ] `cd site && npm run build` 通过，没有报错
- [ ] 首页、`/notes`、至少 3 篇文章页在 `npm run preview` 下能打开
- [ ] 中文 slug 的链接正常（站内链接由 Astro 生成，不用手写）
- [ ] 没有临时脚本或调试文件残留（`_*.py`、`_*.txt`）
- [ ] `book/` 目录没进 git（`.gitignore` 已排除，308 张书页 PNG 只在本地）
- [ ] 提交信息写清楚改了什么

---

## 八、历史配置备忘

早期试过的路径留在这里，供以后参考：

- **EdgeOne Pages**：国内访问快，但预览有时效、域名有限制，已弃用
- **Vercel**：零配置，但国内访问不稳定
- **GitHub Pages**：`<user>.github.io/<repo>` 形式会带路径前缀，站内绝对链接需要额外配置

现在只用 Netlify + GitHub 自动部署。
