export interface ToolChainContext {
  previousResults: any[];
  metadata: Record<string, any>;
}

export interface DeepSeekResponse {
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface CacheEntry {
  result: string;
  timestamp: number;
  ttl: number;
  metadata?: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  result: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ChainableToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  chainable: boolean;
  requiresPrevious?: boolean;
  metadataSchema?: Record<string, any>;
}

export interface ToolChainStep {
  toolName: string;
  params: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ToolChain {
  steps: ToolChainStep[];
  context: ToolChainContext;
}
