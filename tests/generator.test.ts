import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateLLMsTxt } from '../src/generator';

describe('generateLLMsTxt', () => {
  it('writes llms.txt and llms-full.txt', async () => {
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'llms-generate-'),
    );

    await fs.mkdir(path.join(projectDir, 'app'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, 'app/page.tsx'),
      `export const metadata = {
        title: 'Home',
        description: 'Welcome page.'
      };

      export default function Page() {
        return <main><h1>Welcome</h1></main>;
      }`,
    );

    const result = await generateLLMsTxt({
      projectDir,
      title: 'Example',
      description: 'Example app.',
    });

    expect(result.files).toHaveLength(2);
    expect(
      await fs.readFile(path.join(projectDir, 'public/llms.txt'), 'utf8'),
    ).toContain('* [Home](/): Welcome page.');
    expect(
      await fs.readFile(path.join(projectDir, 'public/llms-full.txt'), 'utf8'),
    ).toContain('URL: /');
  });
});
