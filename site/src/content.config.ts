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
  }),
});

export const collections = { docs };