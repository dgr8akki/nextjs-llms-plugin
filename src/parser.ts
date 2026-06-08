import path from 'node:path';

import type { RouteMetadata } from './types';

const markdownExtensions = new Set(['.md', '.mdx']);

export function parseMetadata(source: string, filePath: string): RouteMetadata {
  if (markdownExtensions.has(path.extname(filePath))) {
    return parseFrontmatter(source);
  }

  return parseExportedMetadata(source);
}

export function extractContent(
  source: string,
  filePath: string,
  metadata: RouteMetadata = {},
): string {
  if (markdownExtensions.has(path.extname(filePath))) {
    return stripFrontmatter(source).trim();
  }

  const text = source
    .replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\}\s*;?/m, '')
    .replace(/import\s+[^;]+;?/g, '')
    .replace(/export\s+default\s+function\s+\w*\s*\([^)]*\)\s*\{/g, '')
    .replace(/return\s*\(/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[`'"]([^`'"]+)[`'"]\}/g, '$1')
    .replace(/[{}();]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();

  const heading = metadata.title ? `# ${metadata.title}` : '';
  const description = metadata.description ? `> ${metadata.description}` : '';
  return [heading, description, text].filter(Boolean).join('\n\n');
}

function parseFrontmatter(source: string): RouteMetadata {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) {
    return {};
  }

  const fields: RouteMetadata = {};

  for (const line of match[1].split('\n')) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) {
      continue;
    }

    const key = field[1].trim();
    const value = unquote(field[2].trim());
    if (key === 'title') {
      fields.title = value;
    }
    if (key === 'description') {
      fields.description = value;
    }
  }

  return fields;
}

function parseExportedMetadata(source: string): RouteMetadata {
  const objectLiteral = findMetadataObject(source);
  if (!objectLiteral) {
    return {};
  }

  return {
    title: findStringProperty(objectLiteral, 'title') ?? findNestedDefaultTitle(objectLiteral),
    description: findStringProperty(objectLiteral, 'description'),
  };
}

function findMetadataObject(source: string): string | undefined {
  const exportIndex = source.search(/export\s+const\s+metadata\s*=/);
  if (exportIndex === -1) {
    return undefined;
  }

  const openBrace = source.indexOf('{', exportIndex);
  if (openBrace === -1) {
    return undefined;
  }

  let depth = 0;
  let quote: string | undefined;
  let escaped = false;

  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBrace, index + 1);
      }
    }
  }

  return undefined;
}

function findStringProperty(objectLiteral: string, key: string): string | undefined {
  const property = new RegExp(`(?:^|[,\\n\\r])\\s*${key}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`, 'm');
  const match = objectLiteral.match(property);
  return match?.[2]?.trim();
}

function findNestedDefaultTitle(objectLiteral: string): string | undefined {
  const titleObject = objectLiteral.match(/(?:^|[,\n\r])\s*title\s*:\s*\{([\s\S]*?)\}/m);
  if (!titleObject) {
    return undefined;
  }

  return findStringProperty(`{${titleObject[1]}}`, 'default');
}

function stripFrontmatter(source: string): string {
  return source.replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, '');
}

function unquote(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}
