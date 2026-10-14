import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const docs = await getCollection('docs');
  return rss({
    title: '数字 IC 后端知识库',
    description: '面向数字集成电路后端实现工程师的开源求职知识库',
    site: context.site ?? 'https://ic-backend-kb.netlify.app',
    items: docs
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))
      .map((doc) => ({
        title: doc.data.title,
        description: doc.data.description ?? '',
        link: `/docs/${doc.id.replace(/\.md$/, '')}`,
        pubDate: doc.data.pubDate ?? new Date(),
      })),
  });
}