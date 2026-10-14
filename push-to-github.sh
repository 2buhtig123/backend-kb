#!/usr/bin/env bash
# ============================================================
# 数字 IC 后端求职知识库 - 一键推送到 GitHub
# ============================================================
# 用法:
#   1) GitHub 网页创建空仓库（不要勾选 README/.gitignore/license）
#   2) bash push-to-github.sh git@github.com:YOUR_USERNAME/backend-kb.git
#      或 (HTTPS)
#      bash push-to-github.sh https://github.com/YOUR_USERNAME/backend-kb.git
# ============================================================

set -euo pipefail

# ---- 颜色（Git Bash / WSL / macOS / Linux 都支持） ----
if [[ -t 1 ]]; then
  C_RED=$'\033[0;31m'
  C_GREEN=$'\033[0;32m'
  C_YELLOW=$'\033[0;33m'
  C_BLUE=$'\033[0;34m'
  C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_RESET=""
fi

# ---- 接收参数 ----
REPO_URL="${1:-}"
BRANCH="${2:-main}"

if [[ -z "$REPO_URL" ]]; then
  echo "${C_RED}✗ 错误: 缺少 GitHub 仓库 URL${C_RESET}"
  echo ""
  echo "用法:"
  echo "  bash push-to-github.sh git@github.com:YOUR_USERNAME/backend-kb.git"
  echo "  bash push-to-github.sh https://github.com/YOUR_USERNAME/backend-kb.git"
  echo ""
  echo "步骤:"
  echo "  1. 打开 https://github.com/new"
  echo "  2. 仓库名填: backend-kb"
  echo "  3. 选择 Public 或 Private（按你需求）"
  echo "  4. ⚠️ 不要勾选 Add a README / .gitignore / license"
  echo "  5. 点 Create repository"
  echo "  6. 复制页面上的 SSH 或 HTTPS URL"
  echo "  7. 把这个 URL 作为参数传进来"
  exit 1
fi

# ---- 进入项目根目录 ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "${C_BLUE}==> 当前目录:${C_RESET} $(pwd)"
echo ""

# ---- 1) 初始化 git 仓库（兼容 Git < 2.28 的 -b 参数） ----
echo "${C_BLUE}==> 1) 初始化 Git 仓库${C_RESET}"
if [[ ! -d ".git" ]]; then
  git init > /dev/null
  # 旧版 Git 不支持 -b，用 symbolic-ref 切分支
  git symbolic-ref HEAD "refs/heads/$BRANCH" 2>/dev/null || true
  echo "   ${C_GREEN}✓${C_RESET} 已初始化，分支: ${BRANCH}"
else
  echo "   ${C_GREEN}✓${C_RESET} .git 已存在"
  # 确保当前分支是目标分支
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
      git checkout "$BRANCH"
    else
      git checkout -b "$BRANCH" 2>/dev/null || git branch -m "$BRANCH"
    fi
  fi
fi

# ---- 2) 配置 git 用户（如果没设） ----
if ! git config user.name > /dev/null; then
  echo "   ${C_YELLOW}⚠ 未配置 git user.name，使用默认值（首次推送前可手动 git config）${C_RESET}"
  git config user.name "Backend KB Author"
  git config user.email "noreply@example.com"
fi

# ---- 3) 检查 .gitignore ----
if [[ ! -f ".gitignore" ]]; then
  echo "${C_RED}✗ 错误: 缺少 .gitignore${C_RESET}"
  exit 1
fi

# ---- 4) stage 全部文件 ----
echo "${C_BLUE}==> 2) 添加文件${C_RESET}"
git add -A
STAGED_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
echo "   ${C_GREEN}✓${C_RESET} 已暂存 ${STAGED_COUNT} 个文件"

# ---- 5) 显示预览 ----
echo ""
echo "${C_BLUE}==> 3) 即将提交的文件（前 20 个）${C_RESET}"
git diff --cached --name-only | head -20 | sed 's/^/   /'
if [[ "$STAGED_COUNT" -gt 20 ]]; then
  echo "   ... 还有 $((STAGED_COUNT - 20)) 个"
fi
echo ""

# ---- 6) 提交 ----
echo "${C_BLUE}==> 4) 提交${C_RESET}"
if git diff --cached --quiet; then
  echo "   ${C_YELLOW}⚠ 没有需要提交的内容（可能已经提交过了）${C_RESET}"
else
  git commit -m "init: 数字 IC 后端求职知识库

- 基础知识 12 篇（CMOS/STA/CTS/PNR/PV/UPF + STA进阶/MMMC/ECO/Sign-off/DFT进阶）
- 八股题库 7 专题（时序/CDC/面积/功耗/SI/DFT/工具）
- 秋招/实习/社招汇总
- 工具资源（书单 + 扩展指南）
- Astro 5 + Tailwind 3 + Pagefind 静态站点
- 部署：EdgeOne Pages + Netlify Drop + GitHub Pages 三套
- 总计：24 篇文章，约 9 万字" > /dev/null
  echo "   ${C_GREEN}✓${C_RESET} 已提交"
fi

# ---- 7) 设置 remote ----
echo ""
echo "${C_BLUE}==> 5) 关联远程仓库${C_RESET}"
if git remote get-url origin > /dev/null 2>&1; then
  CURRENT_URL=$(git remote get-url origin)
  if [[ "$CURRENT_URL" != "$REPO_URL" ]]; then
    echo "   ${C_YELLOW}⚠ origin 已存在且 URL 不匹配${C_RESET}"
    echo "     当前: $CURRENT_URL"
    echo "     目标: $REPO_URL"
    read -p "   是否覆盖? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git remote set-url origin "$REPO_URL"
      echo "   ${C_GREEN}✓${C_RESET} 已更新 origin"
    fi
  else
    echo "   ${C_GREEN}✓${C_RESET} origin 已指向 $REPO_URL"
  fi
else
  git remote add origin "$REPO_URL"
  echo "   ${C_GREEN}✓${C_RESET} 已添加 origin: $REPO_URL"
fi

# ---- 8) 推送 ----
echo ""
echo "${C_BLUE}==> 6) 推送到 GitHub${C_RESET}"
echo "   ${C_YELLOW}如果使用 HTTPS，系统会要求输入 GitHub 用户名和 Personal Access Token${C_RESET}"
echo "   ${C_YELLOW}（PAT 创建: https://github.com/settings/tokens/new，勾选 repo）${C_RESET}"
echo ""

if git push -u origin "$BRANCH" 2>&1; then
  echo ""
  echo "${C_GREEN}✓ 推送成功！${C_RESET}"
  echo ""
  echo "接下来你可以:"
  echo "  1) 访问仓库: ${REPO_URL%.git}"
  echo "  2) 在 README.md 顶部加上你的真实仓库 URL"
  echo "  3) (可选) 启用 GitHub Pages: Settings → Pages → Source: GitHub Actions"
  echo "  4) (可选) 给仓库加 topic: digital-ic, physical-design, sta, backend-kb"
else
  echo ""
  echo "${C_RED}✗ 推送失败${C_RESET}"
  echo ""
  echo "常见原因:"
  echo "  1) HTTPS 推送要求 Personal Access Token（不是密码）"
  echo "     创建: https://github.com/settings/tokens/new"
  echo "  2) SSH 推送要求本机有 SSH key 并加到 GitHub"
  echo "     生成: ssh-keygen -t ed25519 -C \"your@email.com\""
  echo "     添加: https://github.com/settings/keys"
  echo "  3) 仓库 URL 拼写错误"
  echo "  4) 仓库已存在且有内容（先在网页上创建一个完全空的仓库）"
  exit 1
fi