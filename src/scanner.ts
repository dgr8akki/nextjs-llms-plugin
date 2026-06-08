import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { LLMsTxtOptions, RouteEntry } from './types';
import { extractContent, parseMetadata } from './parser';

const appPageFiles = new Set([
  'page.tsx',
  'page.ts',
  'page.jsx',
  'page.js',
  'page.mdx',
  'page.md',
]);

const pageExtensions = new Set(['.tsx', '.ts', '.jsx', '.js', '.mdx', '.md']);
const ignoredPageBasenames = new Set([
  '_app',
  '_document',
  '_error',
  '404',
  '500',
]);

export async function scanRoutes(
  projectDir: string,
  options: LLMsTxtOptions = {},
): Promise<RouteEntry[]> {
  const appRoots = ['app', 'src/app'];
  const pagesRoots = ['pages', 'src/pages'];
  const routes: RouteEntry[] = [];

  for (const root of appRoots) {
    const absoluteRoot = path.join(projectDir, root);
    if (await exists(absoluteRoot)) {
      routes.push(...(await scanAppRouter(projectDir, absoluteRoot, options)));
    }
  }

  for (const root of pagesRoots) {
    const absoluteRoot = path.join(projectDir, root);
    if (await exists(absoluteRoot)) {
      routes.push(...(await scanPagesRouter(projectDir, absoluteRoot, options)));
    }
  }

  const includedRoutes = (options.includeRoutes ?? []).map<RouteEntry>((route) => ({
    route: normalizeRoute(route.url),
    filePath: route.url,
    kind: 'include',
    metadata: {
      title: route.title,
      description: route.description,
    },
    section: route.section ?? inferSection(normalizeRoute(route.url), options),
    optional: route.optional ?? false,
    content: route.content ?? '',
  }));

  return [...routes, ...includedRoutes]
    .filter((route) => !isExcluded(route.route, options.excludeRoutes ?? []))
    .sort((a, b) => compareRoutes(a.route, b.route));
}

async function scanAppRouter(
  projectDir: string,
  root: string,
  options: LLMsTxtOptions,
): Promise<RouteEntry[]> {
  const entries: RouteEntry[] = [];

  await walk(root, async (filePath) => {
    const filename = path.basename(filePath);
    if (!appPageFiles.has(filename)) {
      return;
    }

    const route = appPathToRoute(path.relative(root, path.dirname(filePath)));
    if (!isPublicRoute(route)) {
      return;
    }

    entries.push(await createRouteEntry(projectDir, filePath, route, 'app', options));
  });

  return entries;
}

async function scanPagesRouter(
  projectDir: string,
  root: string,
  options: LLMsTxtOptions,
): Promise<RouteEntry[]> {
  const entries: RouteEntry[] = [];

  await walk(root, async (filePath) => {
    const parsed = path.parse(filePath);
    if (!pageExtensions.has(parsed.ext) || ignoredPageBasenames.has(parsed.name)) {
      return;
    }

    if (parsed.name.endsWith('.d') || parsed.name === 'api') {
      return;
    }

    const relative = path.relative(root, filePath);
    if (relative.startsWith(`api${path.sep}`) || relative.includes(`${path.sep}api${path.sep}`)) {
      return;
    }

    const route = pagesPathToRoute(relative);
    if (!isPublicRoute(route)) {
      return;
    }

    entries.push(await createRouteEntry(projectDir, filePath, route, 'pages', options));
  });

  return entries;
}

async function createRouteEntry(
  projectDir: string,
  filePath: string,
  route: string,
  kind: 'app' | 'pages',
  options: LLMsTxtOptions,
): Promise<RouteEntry> {
  const source = await fs.readFile(filePath, 'utf8');
  const metadata = parseMetadata(source, filePath);

  return {
    route,
    filePath: path.relative(projectDir, filePath),
    kind,
    metadata,
    section: inferSection(route, options),
    optional: isOptional(route),
    content: extractContent(source, filePath, metadata),
  };
}

async function walk(
  directory: string,
  onFile: (filePath: string) => Promise<void> | void,
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, onFile);
    } else if (entry.isFile()) {
      await onFile(fullPath);
    }
  }
}

function appPathToRoute(relativeDirectory: string): string {
  const segments = toRouteSegments(relativeDirectory);
  return segmentsToRoute(segments);
}

function pagesPathToRoute(relativeFile: string): string {
  const parsed = path.parse(relativeFile);
  const withoutExtension = path.join(parsed.dir, parsed.name);
  const segments = toRouteSegments(withoutExtension).filter((segment, index, list) => {
    return !(segment === 'index' && index === list.length - 1);
  });

  return segmentsToRoute(segments);
}

function toRouteSegments(relativePath: string): string[] {
  if (!relativePath || relativePath === '.') {
    return [];
  }

  return relativePath
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !segment.startsWith('('))
    .filter((segment) => !segment.startsWith('@'))
    .map((segment) => {
      if (segment.startsWith('[...') && segment.endsWith(']')) {
        return `:${segment.slice(4, -1)}*`;
      }
      if (segment.startsWith('[[...') && segment.endsWith(']]')) {
        return `:${segment.slice(5, -2)}*`;
      }
      if (segment.startsWith('[') && segment.endsWith(']')) {
        return `:${segment.slice(1, -1)}`;
      }
      return segment;
    });
}

function segmentsToRoute(segments: string[]): string {
  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.join('/')}`;
}

function inferSection(route: string, options: LLMsTxtOptions): string {
  for (const [prefix, section] of Object.entries(options.sectionMapping ?? {})) {
    if (route === normalizeRoute(prefix) || route.startsWith(`${normalizeRoute(prefix)}/`)) {
      return section;
    }
  }

  const [firstSegment] = route.split('/').filter(Boolean);
  if (!firstSegment) {
    return 'Overview';
  }

  return titleCase(firstSegment.replace(/-/g, ' '));
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isOptional(route: string): boolean {
  return /\/(blog|changelog|news|legal|privacy|terms)(\/|$)/.test(route);
}

function isPublicRoute(route: string): boolean {
  return !route.includes('/_') && !route.includes('/.');
}

function normalizeRoute(route: string): string {
  if (/^https?:\/\//.test(route)) {
    return route;
  }

  const withSlash = route.startsWith('/') ? route : `/${route}`;
  return withSlash.length > 1 ? withSlash.replace(/\/$/, '') : withSlash;
}

function isExcluded(route: string, excludeRoutes: string[]): boolean {
  return excludeRoutes.some((pattern) => globMatch(route, normalizeRoute(pattern)));
}

function globMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regex = escaped.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
  return new RegExp(`^${regex}$`).test(value);
}

function compareRoutes(a: string, b: string): number {
  if (a === '/') {
    return -1;
  }
  if (b === '/') {
    return 1;
  }
  return a.localeCompare(b);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
