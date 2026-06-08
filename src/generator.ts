import { promises as fs } from 'node:fs';
import path from 'node:path';

import { scanRoutes } from './scanner';
import type { GenerateResult, LLMsTxtOptions, RouteEntry } from './types';

const defaultFilename = 'llms.txt';
const defaultFullFilename = 'llms-full.txt';

export async function generateLLMsTxt(
  options: LLMsTxtOptions = {},
): Promise<GenerateResult> {
  const projectDir = options.projectDir ?? process.cwd();
  const outputDir = path.resolve(projectDir, options.outputDir ?? 'public');
  const routes = await scanRoutes(projectDir, options);
  const siteInfo = await getSiteInfo(projectDir, options);
  const llmsTxt = buildLLMsTxt(routes, siteInfo, options);
  const llmsFullTxt = buildLLMsFullTxt(routes, siteInfo);
  const filename = options.filename ?? defaultFilename;
  const fullFilename = options.fullFilename ?? defaultFullFilename;
  const files = [path.join(outputDir, filename)];

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(files[0], `${llmsTxt}\n`, 'utf8');

  if (options.generateFull !== false) {
    const fullPath = path.join(outputDir, fullFilename);
    await fs.writeFile(fullPath, `${llmsFullTxt}\n`, 'utf8');
    files.push(fullPath);
  }

  return {
    routes,
    llmsTxt,
    llmsFullTxt,
    outputDir,
    files,
  };
}

export function buildLLMsTxt(
  routes: RouteEntry[],
  siteInfo: { title: string; description: string },
  options: LLMsTxtOptions = {},
): string {
  const requiredRoutes = routes.filter((route) => !route.optional);
  const optionalRoutes = routes.filter((route) => route.optional);
  const lines = [`# ${siteInfo.title}`, '', `> ${siteInfo.description}`];
  const details = normalizeDetails(options.details);

  if (details.length > 0) {
    lines.push('', ...details);
  }

  for (const [section, sectionRoutes] of groupBySection(requiredRoutes)) {
    lines.push('', `## ${section}`, '');
    lines.push(...sectionRoutes.map(formatRouteLink));
  }

  if (optionalRoutes.length > 0) {
    lines.push('', '## Optional', '');
    lines.push(...optionalRoutes.map(formatRouteLink));
  }

  return lines.join('\n').trim();
}

export function buildLLMsFullTxt(
  routes: RouteEntry[],
  siteInfo: { title: string; description: string },
): string {
  const lines = [
    `# ${siteInfo.title}`,
    '',
    `> ${siteInfo.description}`,
    '',
    'This file contains generated page context for LLMs and AI agents.',
  ];

  for (const route of routes) {
    lines.push('', '---', '', `# ${routeTitle(route)}`, '', `URL: ${route.route}`);
    if (route.metadata.description) {
      lines.push('', route.metadata.description);
    }
    if (route.content) {
      lines.push('', route.content);
    }
  }

  return lines.join('\n').trim();
}

async function getSiteInfo(
  projectDir: string,
  options: LLMsTxtOptions,
): Promise<{ title: string; description: string }> {
  const packageJson = await readPackageJson(projectDir);
  const title = options.title ?? packageJson?.name ?? path.basename(projectDir);
  const description =
    options.description ??
    packageJson?.description ??
    'A generated overview of the public pages in this Next.js application.';

  return { title, description };
}

async function readPackageJson(
  projectDir: string,
): Promise<{ name?: string; description?: string } | undefined> {
  try {
    const raw = await fs.readFile(path.join(projectDir, 'package.json'), 'utf8');
    return JSON.parse(raw) as { name?: string; description?: string };
  } catch {
    return undefined;
  }
}

function normalizeDetails(details: string | string[] | undefined): string[] {
  if (!details) {
    return [];
  }

  return Array.isArray(details) ? details : [details];
}

function groupBySection(routes: RouteEntry[]): Array<[string, RouteEntry[]]> {
  const sections = new Map<string, RouteEntry[]>();

  for (const route of routes) {
    const existing = sections.get(route.section) ?? [];
    existing.push(route);
    sections.set(route.section, existing);
  }

  return [...sections.entries()];
}

function formatRouteLink(route: RouteEntry): string {
  const description = route.metadata.description ? `: ${route.metadata.description}` : '';
  return `* [${routeTitle(route)}](${route.route})${description}`;
}

function routeTitle(route: RouteEntry): string {
  if (route.metadata.title) {
    return route.metadata.title;
  }

  if (route.route === '/') {
    return 'Home';
  }

  const segment = route.route.split('/').filter(Boolean).at(-1) ?? route.route;
  return segment
    .replace(/^:/, '')
    .replace(/\*$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}
