import sharp from 'sharp';
import fs from 'node:fs';

const W = 1200;
const H = 630;

const chip = (x, y, s, color, opacity = 1) => `
<g transform="translate(${x},${y}) scale(${s})" opacity="${opacity}">
  <rect x="-9" y="-9" width="18" height="18" rx="3" fill="none" stroke="${color}" stroke-width="1.6"/>
  <rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="${color}"/>
  <path d="M-3 -9v-4M0 -9v-4M3 -9v-4M-3 9v4M0 9v4M3 9v4M-9 -3h-4M-9 0h-4M-9 3h-4M9 -3h4M9 0h4M9 3h4"
        stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="sheet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fbff"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sheet)"/>

  <!-- 背景装饰：淡蓝网格 -->
  <g opacity="0.5">
    ${Array.from({ length: 13 })
      .map((_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${H}" stroke="#e2e8f0" stroke-width="1"/>`)
      .join('')}
    ${Array.from({ length: 7 })
      .map((_, i) => `<line x1="0" y1="${i * 100}" x2="${W}" y2="${i * 100}" stroke="#e2e8f0" stroke-width="1"/>`)
      .join('')}
  </g>

  <!-- 右上角蓝色柔光 -->
  <circle cx="1130" cy="90" r="260" fill="url(#brand)" opacity="0.07"/>

  <!-- 左侧竖向色条 -->
  <rect x="0" y="0" width="10" height="${H}" fill="url(#brand)"/>

  <!-- Logo 徽章 -->
  <rect x="96" y="192" width="96" height="96" rx="22" fill="url(#brand)"/>
  ${chip(144, 240, 2.0, '#ffffff')}

  <!-- 主标题 -->
  <text x="232" y="252" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif"
        font-size="64" font-weight="700" fill="#0f172a" letter-spacing="1">数字 IC 后端知识库</text>

  <!-- 英文副标 -->
  <text x="234" y="298" font-family="Segoe UI, Arial, Helvetica, sans-serif"
        font-size="26" font-weight="500" fill="#2563eb" letter-spacing="3">DIGITAL BACKEND KNOWLEDGE BASE</text>

  <!-- 分隔线 -->
  <rect x="96" y="346" width="420" height="4" rx="2" fill="url(#brand)"/>

  <!-- 关键词 -->
  <text x="96" y="404" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif"
        font-size="30" fill="#475569">静态时序分析 · 时钟树综合 · 布局布线</text>
  <text x="96" y="452" font-family="Microsoft YaHei, PingFang SC, SimHei, sans-serif"
        font-size="30" fill="#475569">物理验证 · 低功耗设计 · 秋招八股 · 面经</text>

  <!-- 右下角装饰芯片 -->
  ${chip(1000, 470, 4.2, '#2563eb', 0.12)}
  ${chip(1090, 545, 2.6, '#38bdf8', 0.14)}

  <!-- 域名 -->
  <text x="96" y="556" font-family="Consolas, Menlo, monospace"
        font-size="24" fill="#94a3b8">ic-backend-kb.netlify.app</text>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ quality: 100, compressionLevel: 9 })
  .toFile('./public/og-image.png');

console.log('og-image.png written');
