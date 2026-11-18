import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({
    base: './src/content/works',
    pattern: '*/*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
});

const pages = defineCollection({
  loader: glob({
    base: './src/content/pages',
    pattern: '*.md',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
});

export const collections = { notes, pages };
