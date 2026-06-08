import path from 'node:path';

import { generateLLMsTxt } from './generator';
import type { LLMsTxtOptions } from './types';

type WebpackConfig = {
  plugins?: unknown[];
  [key: string]: unknown;
};

type WebpackContext = {
  dir?: string;
  dev?: boolean;
  isServer?: boolean;
  [key: string]: unknown;
};

type NextConfig = {
  webpack?: (
    config: WebpackConfig,
    context: WebpackContext,
  ) => WebpackConfig | Promise<WebpackConfig>;
  [key: string]: unknown;
};

type Compiler = {
  hooks?: {
    afterEmit?: {
      tapPromise: (name: string, callback: () => Promise<void>) => void;
    };
  };
};

const pluginName = 'NextLLMsTxtPlugin';

export class NextLLMsTxtPlugin {
  private readonly options: LLMsTxtOptions;

  constructor(options: LLMsTxtOptions = {}) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    compiler.hooks?.afterEmit?.tapPromise(pluginName, async () => {
      await generateLLMsTxt(this.options);
    });
  }
}

export function withLLMsTxt(
  nextConfig: NextConfig = {},
  options: LLMsTxtOptions = {},
): NextConfig {
  return {
    ...nextConfig,
    webpack(config: WebpackConfig, context: WebpackContext) {
      const projectDir = options.projectDir ?? context.dir ?? process.cwd();

      if (context.isServer !== false) {
        config.plugins = [
          ...(config.plugins ?? []),
          new NextLLMsTxtPlugin({
            ...options,
            projectDir: path.resolve(projectDir),
          }),
        ];
      }

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, context);
      }

      return config;
    },
  };
}

export { buildLLMsFullTxt, buildLLMsTxt, generateLLMsTxt } from './generator';
export { scanRoutes } from './scanner';
export type {
  GenerateResult,
  IncludeRoute,
  LLMsTxtOptions,
  RouteEntry,
  RouteMetadata,
} from './types';
