import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { scanRoutes } from '../src/scanner';

describe('scanRoutes', () => {
  it('discovers app router and pages router routes', async () => {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llms-scan-'));

    await fs.mkdir(path.join(projectDir, 'app/docs/getting-started'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(projectDir, 'app/docs/getting-started/page.tsx'),
      `export const metadata = {
        title: 'Getting started',
        description: 'Set up the app.'
      };

      export default function Page() {
        return <main><h1>Install</h1><p>Run npm install.</p></main>;
      }`,
    );

    await fs.mkdir(path.join(projectDir, 'src/pages'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'src/pages/about.mdx'),
      `---
title: About
description: Learn about us.
---

# About

We build tools.`,
    );

    const routes = await scanRoutes(projectDir, {
      sectionMapping: { '/docs': 'Documentation' },
    });

    expect(routes.map((route) => route.route)).toEqual([
      '/about',
      '/docs/getting-started',
    ]);
    expect(routes[1].section).toBe('Documentation');
    expect(routes[1].metadata).toEqual({
      title: 'Getting started',
      description: 'Set up the app.',
    });
  });
});
