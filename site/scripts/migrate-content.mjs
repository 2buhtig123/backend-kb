/**
 * 把 backend-kb/ 下的 Markdown 内容迁移到 src/content/docs/
 * 自动加上 frontmatter (title, description, module, order)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SITE_CONTENT = path.resolve(__dirname, '../src/content/docs');

const MODULE_MAP = {
  '01-基础知识': 'basics',
  '02-八股题库': 'interview',
  '03-秋招汇总': 'autumn-recruit',
  '04-社招汇总': 'social-recruit',
  '05-实习汇总': 'internship',
  '06-工具资源': 'tools',
};

const MODULE_TITLES = {
  basics: '基础知识',
  interview: '八股题库',
  'autumn-recruit': '秋招汇总',
  'social-recruit': '社招汇总',
  internship: '实习汇总',
  tools: '工具资源',
};

function extractTitle(content, filename) {
  // 匹配第一个 # 标题
  const m = content.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return path.basename(filename, '.md');
}

function extractDescription(content) {
  // 取第一段非空文本作为描述
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('|')) continue;
    if (trimmed.startsWith('```')) continue;
    return trimmed.replace(/[*_`]/g, '').slice(0, 150);
  }
  return '';
}

function buildFrontmatter({ title, description, module, order }) {
  return `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
module: ${module}
order: ${order}
---

`;
}

let totalFiles = 0;
let totalModules = 0;

for (const [srcDir, moduleKey] of Object.entries(MODULE_MAP)) {
  const srcPath = path.join(ROOT, srcDir);
  if (!fs.existsSync(srcPath)) {
    console.log(`  ⚠️ ${srcDir} 不存在，跳过`);
    continue;
  }

  const files = fs.readdirSync(srcPath).filter((f) => f.endsWith('.md'));
  if (files.length === 0) continue;

  console.log(`\n📁 ${srcDir} → ${moduleKey}/`);
  totalModules++;

  files.forEach((filename, i) => {
    const srcFile = path.join(srcPath, filename);
    const destFile = path.join(SITE_CONTENT, moduleKey, filename);

    let content = fs.readFileSync(srcFile, 'utf-8');

    // 提取 title 和 description
    const title = extractTitle(content, filename);
    const description = extractDescription(content);

    // 检查是否已有 frontmatter（防止覆盖 README 的元信息）
    if (!content.startsWith('---')) {
      const fm = buildFrontmatter({ title, description, module: moduleKey, order: i });
      content = fm + content;
    }

    fs.writeFileSync(destFile, content, 'utf-8');
    console.log(`  ✓ ${filename} → ${moduleKey}/${filename}`);
    totalFiles++;
  });
}

// 处理根目录的 README.md —— 复制到 src/pages 作为首页摘要（不放入 collection）
const readmePath = path.join(ROOT, 'README.md');
if (fs.existsSync(readmePath)) {
  const content = fs.readFileSync(readmePath, 'utf-8');
  // 直接复制到 src/content/raw-readme.md，供 Layout 引用
  fs.writeFileSync(path.join(__dirname, '../src/content/raw-readme.md'), content, 'utf-8');
  console.log(`\n📄 README.md → src/content/raw-readme.md (供 Layout 引用)`);
}

console.log(`\n✅ 共迁移 ${totalFiles} 篇文章，${totalModules} 个模块`);