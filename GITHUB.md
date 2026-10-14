# GitHub 推送指南

## 一、GitHub 仓库创建步骤（1 分钟）

1. 打开 <https://github.com/new>
2. **Owner**：选择你的 GitHub 账号
3. **Repository name**：填 `backend-kb`（或别的名字，URL 跟着变）
4. **Description**（可选）：数字 IC 后端求职知识库
5. **可见性**：
   - 🟢 **Public**（推荐）：作为个人作品集 + 求职名片，**为你的简历加分**
   - 🔒 **Private**：纯自用，不公开
6. ⚠️ **关键**：以下 3 项**全部不要勾选**
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
7. 点 **Create repository**

---

## 二、一键推送

### 方式 A：用项目里的脚本（推荐）

```bash
cd C:\Users\13643\WorkBuddy\2026-10-13-21-54-14\backend-kb
bash push-to-github.sh git@github.com:YOUR_USERNAME/backend-kb.git
```

> 把 `YOUR_USERNAME` 换成你的 GitHub 用户名。

脚本会自动：
1. `git init -b main`
2. 添加全部文件（遵守 `.gitignore`，不会传 `node_modules`、`dist`）
3. 第一次提交
4. 关联 `origin` 远程
5. 推送到 `main` 分支

### 方式 B：用 GitHub CLI（如果有 `gh`）

```bash
cd C:\Users\13643\WorkBuddy\2026-10-13-21-54-14\backend-kb
gh repo create backend-kb --public --source=. --remote=origin --push
```

> 装 GitHub CLI：<https://cli.github.com/>

### 方式 C：手动一行一行

```bash
cd C:\Users\13643\WorkBuddy\2026-10-13-21-54-14\backend-kb
git init -b main
git add -A
git commit -m "init: 数字 IC 后端求职知识库 v0.9"
git remote add origin git@github.com:YOUR_USERNAME/backend-kb.git
git push -u origin main
```

---

## 三、HTTPS vs SSH 怎么选

| 协议 | 优点 | 缺点 |
|---|---|---|
| **HTTPS** (`https://github.com/...`) | 配置简单，零依赖 | 推送时要输入 Personal Access Token（不是密码）|
| **SSH** (`git@github.com:...`) | 推送免密 | 需要先配 SSH key |

### HTTPS 推送：配 Personal Access Token

GitHub 早已不支持密码推送。PAT 配置：

1. 打开 <https://github.com/settings/tokens/new>
2. Note 填 `backend-kb`
3. Expiration 选 30 天（够用）
4. Scopes 勾选 `repo`
5. 点 **Generate token**
6. **复制 token**（只显示一次！）
7. 推送时 Username = 你的 GitHub 用户名，Password = 这个 token

### SSH 推送：配 SSH key

```bash
# 1. 生成 key
ssh-keygen -t ed25519 -C "your_email@example.com"
# 一路回车，密码可空

# 2. 复制公钥
cat ~/.ssh/id_ed25519.pub
# Windows: type %USERPROFILE%\.ssh\id_ed25519.pub

# 3. 粘贴到 GitHub
# https://github.com/settings/keys → New SSH key → 粘贴
```

---

## 四、推送后可选操作

### 1. 启用 GitHub Pages（自动部署）

**前提**：仓库设为 Public（Private 仓库的 GH Pages 要 Pro）。

- 打开仓库 → **Settings** → **Pages**
- Source 选 **GitHub Actions**
- 推送后 2-3 分钟自动上线，地址：`https://YOUR_USERNAME.github.io/backend-kb/`

`deploy.yml` 已经写好在 `.github/workflows/`，自动识别 `backend-kb/site/` 子目录。

### 2. 添加 Topics（让仓库更容易被搜索）

- 仓库主页 → 右上角齿轮 → 添加：`digital-ic`, `physical-design`, `sta`, `backend-kb`, `knowledge-base`

### 3. 加 About 简介

- 仓库主页 → 右上角 About 旁的齿轮 → Description + Website

### 4. (可选) 启用 Discussions / Wiki

- Settings → Features → 勾选 Discussions（评论/讨论）

---

## 五、推送失败排查

| 错误信息 | 原因 | 解决 |
|---|---|---|
| `remote: Support for password authentication was removed` | HTTPS 用了密码 | 改用 Personal Access Token |
| `Permission denied (publickey)` | SSH key 没配 | 见上面"SSH 推送"段 |
| `Repository not found` | URL 拼错 | 检查用户名、仓库名大小写 |
| `Updates were rejected because the remote contains work` | 远程已有内容（你勾了 README/license） | 删除远程仓库重创建，**或** `git pull origin main --rebase` |
| `fatal: refusing to merge unrelated histories` | 同上 | 删远程重创建 |

---

## 六、推送后立刻看的几个 URL

| URL | 看到的内容 |
|---|---|
| `https://github.com/YOUR_USERNAME/backend-kb` | 仓库主页 |
| `https://github.com/YOUR_USERNAME/backend-kb/blob/main/README.md` | 自动渲染的 README |
| `https://YOUR_USERNAME.github.io/backend-kb/` | （启用 GH Pages 后）自动部署的站点 |
| `https://github.com/YOUR_USERNAME/backend-kb/actions | 部署进度 |

---

## 七、回滚/撤销（万一推送错了）

```bash
# 撤销最近一次 commit（保留改动在工作区）
git reset --soft HEAD~1

# 撤销最近一次 commit（丢弃改动）
git reset --hard HEAD~1

# 远程也回滚
git push origin main --force   # ⚠️ 慎用
```

更安全的做法：直接 `git revert HEAD`，生成一个"反 commit"，保留历史。