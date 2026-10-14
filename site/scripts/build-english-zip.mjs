// scripts/build-english-zip.mjs
// 为 EdgeOne Pages（及其他对中文路径敏感的部署平台）生成"全英文路径"版本
// 保留 dist/ 原版不动，方便 Google/Vercel 等支持中文的平台继续用
//
// 用法：node scripts/build-english-zip.mjs
//       （npm run build 后运行）

import fs from 'node:fs';
import path from 'node:path';

const CWD = process.cwd();
const src = path.join(CWD, 'dist');
const dest = path.join(CWD, 'dist-en');

if (!fs.existsSync(src)) {
  console.error('✗ dist/ 不存在，请先 npm run build');
  process.exit(1);
}

// 中文 slug → 英文 slug 映射（覆盖了 dist/ 中所有中文目录名）
const slugMap = [
  ['01-静态时序分析sta', '01-static-timing-analysis-sta'],
  ['02-时钟树综合cts', '02-clock-tree-synthesis-cts'],
  ['03-cmos数字电路基础', '03-cmos-digital-circuits-fundamentals'],
  ['04-布局布线pnr', '04-place-and-route-pnr'],
  ['05-物理验证pv', '05-physical-verification-pv'],
  ['06-低功耗设计upf', '06-low-power-design-upf'],
  ['01-时序专题', '01-timing-topics'],
  ['02-跨时钟域cdc', '02-clock-domain-crossing-cdc'],
  ['01-头部公司秋招汇总', '01-top-companies-autumn-recruitment'],
];

const containsChinese = (s) => /[\u4e00-\u9fa5]/.test(s);
const applySlug = (s) => {
  let out = s;
  for (const [zh, en] of slugMap) {
    if (out.includes(zh)) out = out.split(zh).join(en);
  }
  return out;
};
const renameIfChinese = (name) => (containsChinese(name) ? applySlug(name) : name);

// 1. 清理旧产物
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
  console.log('→ 已清理旧 dist-en/');
}

// 2. 复制 + 重命名中文目录/文件
function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const dName = renameIfChinese(entry.name);
    const d = path.join(destDir, dName);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(src, dest);
console.log(`✓ 已复制 dist/ → dist-en/（含 ${slugMap.length} 条 slug 映射）`);

// 3. 替换 HTML/XML 内部的链接（href、srcset、sitemap 链接等）
const textExt = new Set(['.html', '.xml']);
let updatedFiles = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
    } else if (textExt.has(path.extname(p))) {
      let txt = fs.readFileSync(p, 'utf-8');
      const orig = txt;
      for (const [zh, en] of slugMap) {
        if (txt.includes(zh)) txt = txt.split(zh).join(en);
      }
      if (txt !== orig) {
        fs.writeFileSync(p, txt);
        updatedFiles++;
      }
    }
  }
}
walk(dest);
console.log(`✓ 已更新 ${updatedFiles} 个 HTML/XML 文件内的链接`);

const destSize = (() => {
  let total = 0;
  function sum(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) sum(p);
      else total += fs.statSync(p).size;
    }
  }
  sum(dest);
  return total;
})();
console.log(`\n✅ dist-en/ 已就绪：${(destSize / 1024).toFixed(1)} KB`);
console.log('\n下一步：在 PowerShell 中运行');
console.log('  Compress-Archive -Path dist-en/* -DestinationPath deploy-en.zip\n');
