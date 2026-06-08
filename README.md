# nextjs-llms-plugin

Generate `llms.txt` and `llms-full.txt` for a Next.js app during compilation.

## Install

```sh
npm install nextjs-llms-plugin
```

## Usage

```js
// next.config.js
const { withLLMsTxt } = require('nextjs-llms-plugin');

module.exports = withLLMsTxt(
  {
    reactStrictMode: true,
  },
  {
    title: 'Acme Docs',
    description: 'Documentation and product pages for Acme.',
    sectionMapping: {
      '/docs': 'Documentation',
      '/api': 'API Reference',
    },
    excludeRoutes: ['/admin/**'],
  },
);
```

The plugin scans `app`, `src/app`, `pages`, and `src/pages`, then writes:

- `public/llms.txt`
- `public/llms-full.txt`

## Options

```ts
interface LLMsTxtOptions {
  title?: string;
  description?: string;
  details?: string | string[];
  excludeRoutes?: string[];
  includeRoutes?: Array<{
    title: string;
    url: string;
    description?: string;
    section?: string;
    optional?: boolean;
    content?: string;
  }>;
  sectionMapping?: Record<string, string>;
  outputDir?: string;
  projectDir?: string;
  generateFull?: boolean;
  filename?: string;
  fullFilename?: string;
}
```

Static metadata is read from Markdown/MDX frontmatter and common App Router exports:

```ts
export const metadata = {
  title: 'Getting started',
  description: 'Install and configure the project.',
};
```

## Programmatic generation

```ts
import { generateLLMsTxt } from 'nextjs-llms-plugin';

await generateLLMsTxt({
  projectDir: process.cwd(),
  title: 'Acme',
  description: 'Acme public site.',
});
```
