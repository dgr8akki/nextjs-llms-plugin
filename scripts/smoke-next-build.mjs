import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const appDir = await mkdtemp(path.join(tmpdir(), 'nextjs-llms-plugin-smoke-'));

try {
  await mkdir(path.join(appDir, 'app/docs/getting-started'), {
    recursive: true,
  });

  await writeFile(
    path.join(appDir, 'package.json'),
    JSON.stringify(
      {
        private: true,
        scripts: {
          build: 'next build',
        },
        dependencies: {
          next: '^15.3.0',
          'nextjs-llms-plugin': `file:${repoRoot}`,
          react: '^19.0.0',
          'react-dom': '^19.0.0',
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    path.join(appDir, 'next.config.js'),
    `const { withLLMsTxt } = require('nextjs-llms-plugin');

module.exports = withLLMsTxt({}, {
  title: 'Smoke Site',
  description: 'A temporary Next.js app for release verification.',
  sectionMapping: {
    '/docs': 'Documentation',
  },
});
`,
  );

  await writeFile(
    path.join(appDir, 'app/layout.jsx'),
    `export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  );

  await writeFile(
    path.join(appDir, 'app/page.jsx'),
    `export const metadata = {
  title: 'Smoke Home',
  description: 'The generated homepage metadata.',
};

export default function HomePage() {
  return <main><h1>Smoke Home</h1></main>;
}
`,
  );

  await writeFile(
    path.join(appDir, 'app/docs/getting-started/page.jsx'),
    `export const metadata = {
  title: 'Getting Started',
  description: 'Set up the smoke application.',
};

export default function GettingStartedPage() {
  return <main><h1>Getting Started</h1></main>;
}
`,
  );

  await run('npm', ['install'], appDir);
  await run('npm', ['run', 'build'], appDir);

  const llmsTxt = await readFile(path.join(appDir, 'public/llms.txt'), 'utf8');
  const llmsFullTxt = await readFile(
    path.join(appDir, 'public/llms-full.txt'),
    'utf8',
  );

  assertIncludes(llmsTxt, '# Smoke Site');
  assertIncludes(
    llmsTxt,
    '* [Smoke Home](/): The generated homepage metadata.',
  );
  assertIncludes(
    llmsTxt,
    '* [Getting Started](/docs/getting-started): Set up the smoke application.',
  );
  assertIncludes(llmsFullTxt, 'URL: /docs/getting-started');
} finally {
  await rm(appDir, { recursive: true, force: true });
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${command} ${args.join(' ')} exited with code ${code}`),
        );
      }
    });
  });
}

function assertIncludes(value, expected) {
  if (!value.includes(expected)) {
    throw new Error(`Expected generated output to include: ${expected}`);
  }
}
