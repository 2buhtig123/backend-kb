// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

// 部署平台配置 - EdgeOne Pages / Vercel / Netlify 都自动识别
export default defineConfig({
  site: 'https://ic-backend-kb.netlify.app',
  trailingSlash: 'ignore',

  // 中文站点
  i18n: {
    defaultLocale: 'zh-CN',
    locales: ['zh-CN'],
  },

  // Markdown 处理
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'wrap',
          properties: { className: ['anchor-link'] },
        },
      ],
      [
        rehypeExternalLinks,
        { target: '_blank', rel: ['noopener', 'noreferrer'] },
      ],
    ],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

  integrations: [
    mdx(),
    sitemap(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],

  // 静态资源构建配置
  build: {
    assets: '_assets',
    format: 'directory',
  },

  vite: {
    build: {
      // 兼容旧浏览器
      target: 'es2020',
      rollupOptions: {
        // Pagefind 在 build 后才生成，build 时跳过
        external: [/pagefind\/.*/],
      },
    },
  },
});