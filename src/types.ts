export interface IncludeRoute {
  title: string;
  url: string;
  description?: string;
  section?: string;
  optional?: boolean;
  content?: string;
}

export interface LLMsTxtOptions {
  title?: string;
  description?: string;
  details?: string | string[];
  excludeRoutes?: string[];
  includeRoutes?: IncludeRoute[];
  sectionMapping?: Record<string, string>;
  outputDir?: string;
  projectDir?: string;
  generateFull?: boolean;
  fullFilename?: string;
  filename?: string;
}

export interface RouteMetadata {
  title?: string;
  description?: string;
}

export interface RouteEntry {
  route: string;
  filePath: string;
  kind: 'app' | 'pages' | 'include';
  metadata: RouteMetadata;
  section: string;
  optional: boolean;
  content: string;
}

export interface GenerateResult {
  routes: RouteEntry[];
  llmsTxt: string;
  llmsFullTxt: string;
  outputDir: string;
  files: string[];
}
