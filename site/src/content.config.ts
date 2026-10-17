/**
 * Astro Content Collections 配置
 * 把现有 Markdown 内容按"模块"分类
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    module: z.enum(['basics', 'interview', 'career', 'autumn-recruit', 'social-recruit', 'internship', 'tools']),
    order: z.number().default(99),
    // 参考依据：本篇内容对应哪本参考书的哪一章，供读者交叉核对
    references: z.array(z.string()).optional(),
    // 是否已按主参考书逐页核对过（true = 正文中出现的页码引用均经核对）
    verified: z.boolean().default(false),
  }),
});

export const collections = { docs };