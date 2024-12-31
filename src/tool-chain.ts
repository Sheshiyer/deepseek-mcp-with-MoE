import { ToolChain, ToolChainContext, ToolChainStep, ToolResult, ChainableToolConfig } from './types';
import { Cache } from './cache';

interface SchemaProperty {
  type: string;
  description?: string;
}

interface ValidationSchema {
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export class ToolChainManager {
  private tools: Map<string, ChainableToolConfig>;
  private cache: Cache;

  constructor() {
    this.tools = new Map();
    this.cache = new Cache();
  }

  registerTool(config: ChainableToolConfig): void {
    this.tools.set(config.name, config);
  }

  async executeChain(chain: ToolChain): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    const context: ToolChainContext = {
      previousResults: [],
      metadata: {}
    };

    // Check cache for entire chain result
    const chainKey = Cache.generateChainKey(chain.steps);
    const cachedResult = this.cache.get(chainKey);
    if (cachedResult) {
      try {
        const parsed = JSON.parse(cachedResult);
        return parsed;
      } catch (error) {
        console.error('Error parsing cached chain result:', error);
      }
    }

    // Execute each step in the chain
    for (const step of chain.steps) {
      try {
        const result = await this.executeStep(step, context);
        results.push(result);
        
        if (!result.success) {
          break; // Stop chain execution on failure
        }

        // Update context for next step
        context.previousResults.push(result);
        if (result.metadata) {
          context.metadata = { ...context.metadata, ...result.metadata };
        }
      } catch (error) {
        results.push({
          success: false,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        break;
      }
    }

    // Cache successful chain results
    if (results.every(r => r.success)) {
      this.cache.set(chainKey, JSON.stringify(results), 3600); // 1 hour TTL
    }

    return results;
  }

  private async executeStep(step: ToolChainStep, context: ToolChainContext): Promise<ToolResult> {
    const tool = this.tools.get(step.toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${step.toolName}`);
    }

    // Validate tool requirements
    if (tool.requiresPrevious && context.previousResults.length === 0) {
      throw new Error(`Tool ${step.toolName} requires previous results`);
    }

    // Validate input parameters
    this.validateParams(step.params, tool.inputSchema as ValidationSchema);

    // Check step-level cache
    const stepKey = `${step.toolName}:${JSON.stringify(step.params)}`;
    const cachedResult = this.cache.get(stepKey);
    if (cachedResult) {
      try {
        return JSON.parse(cachedResult);
      } catch (error) {
        console.error('Error parsing cached step result:', error);
      }
    }

    try {
      // Execute tool with context
      const result: ToolResult = {
        success: true,
        result: await this.executeTool(tool, step.params, context),
        metadata: step.metadata
      };

      // Cache successful results
      this.cache.set(stepKey, JSON.stringify(result), 3600); // 1 hour TTL
      return result;
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: step.metadata
      };
    }
  }

  private async executeTool(
    tool: ChainableToolConfig,
    params: Record<string, any>,
    context: ToolChainContext
  ): Promise<any> {
    // This would be implemented by the specific tool handler
    throw new Error('Tool execution not implemented');
  }

  private validateParams(params: Record<string, any>, schema: ValidationSchema): void {
    // Basic schema validation
    for (const [key, value] of Object.entries(schema.properties)) {
      if (schema.required?.includes(key) && !(key in params)) {
        throw new Error(`Missing required parameter: ${key}`);
      }

      if (key in params) {
        const paramValue = params[key];
        if (value.type && typeof paramValue !== value.type) {
          throw new Error(`Invalid type for parameter ${key}: expected ${value.type}, got ${typeof paramValue}`);
        }
      }
    }
  }

  // Helper methods for chain manipulation
  addStep(chain: ToolChain, step: ToolChainStep): void {
    chain.steps.push(step);
  }

  removeStep(chain: ToolChain, index: number): void {
    chain.steps.splice(index, 1);
  }

  clearChain(chain: ToolChain): void {
    chain.steps = [];
    chain.context = { previousResults: [], metadata: {} };
  }
}
