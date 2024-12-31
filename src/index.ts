#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Request
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError } from 'axios';
import { ToolChainManager } from './tool-chain';
import { ChainableToolConfig, ToolChain } from './types';

interface ToolRequest extends Request {
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface ChainStep {
  toolName: string;
  params: Record<string, unknown>;
}

interface ChainRequest extends Request {
  params: {
    name: string;
    arguments: {
      steps: ChainStep[];
    };
  };
}

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) {
  throw new Error('DEEPSEEK_API_KEY environment variable is required');
}

interface DeepSeekResponse {
  choices: Array<{
    text: string;
  }>;
}

class DeepSeekServer {
  private server: Server;
  private chainManager: ToolChainManager;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'deepseek-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.chainManager = new ToolChainManager();
    
    this.axiosInstance = axios.create({
      baseURL: 'https://api.deepseek.com/v1',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    // Code Generation Tool
    const generateCodeConfig: ChainableToolConfig = {
      name: 'generate_code',
      description: 'Generate code using DeepSeek API',
      chainable: true,
      inputSchema: {
        properties: {
          prompt: {
            type: 'string',
            description: 'The code generation prompt'
          },
          language: {
            type: 'string',
            description: 'Target programming language'
          },
          temperature: {
            type: 'number',
            description: 'Sampling temperature (0-1)'
          }
        },
        required: ['prompt']
      }
    };

    // Code Completion Tool
    const completeCodeConfig: ChainableToolConfig = {
      name: 'complete_code',
      description: 'Get code completions using DeepSeek',
      chainable: true,
      inputSchema: {
        properties: {
          code: {
            type: 'string',
            description: 'Existing code context'
          },
          prompt: {
            type: 'string',
            description: 'Completion prompt'
          },
          temperature: {
            type: 'number',
            description: 'Sampling temperature'
          }
        },
        required: ['code', 'prompt']
      }
    };

    // Code Optimization Tool
    const optimizeCodeConfig: ChainableToolConfig = {
      name: 'optimize_code',
      description: 'Optimize code using DeepSeek',
      chainable: true,
      requiresPrevious: true,
      inputSchema: {
        properties: {
          code: {
            type: 'string',
            description: 'Code to optimize'
          },
          target: {
            type: 'string',
            description: 'Optimization target (performance, memory, readability)'
          }
        },
        required: ['code']
      }
    };

    // Register tools
    this.chainManager.registerTool(generateCodeConfig);
    this.chainManager.registerTool(completeCodeConfig);
    this.chainManager.registerTool(optimizeCodeConfig);

    // Set up MCP tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_code',
          description: 'Generate code using DeepSeek API',
          inputSchema: generateCodeConfig.inputSchema
        },
        {
          name: 'complete_code',
          description: 'Get code completions using DeepSeek',
          inputSchema: completeCodeConfig.inputSchema
        },
        {
          name: 'optimize_code',
          description: 'Optimize code using DeepSeek',
          inputSchema: optimizeCodeConfig.inputSchema
        },
        {
          name: 'execute_chain',
          description: 'Execute a chain of DeepSeek tools',
          inputSchema: {
            type: 'object',
            properties: {
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    toolName: { type: 'string' },
                    params: { type: 'object' }
                  },
                  required: ['toolName', 'params']
                }
              }
            },
            required: ['steps']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: Request) => {
      try {
        if (!request.params?.name) {
          throw new Error('Invalid request: missing tool name');
        }

        if (request.params.name === 'execute_chain') {
          const chainRequest = request as ChainRequest;
          if (!chainRequest.params.arguments?.steps) {
            throw new Error('Invalid chain request: missing steps');
          }

          const chain: ToolChain = {
            steps: chainRequest.params.arguments.steps,
            context: { previousResults: [], metadata: {} }
          };
          
          const results = await this.chainManager.executeChain(chain);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }]
          };
        }

        // Handle individual tool calls
        const toolRequest = request as ToolRequest;
        const result = await this.handleToolCall(
          toolRequest.params.name,
          toolRequest.params.arguments
        );

        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      } catch (error: unknown) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    });
  }

  private async handleToolCall(name: string, params: Record<string, unknown>): Promise<string> {
    try {
      const response = await this.axiosInstance.post<DeepSeekResponse>('/completions', {
        prompt: this.buildPrompt(name, params),
        temperature: params.temperature || 0.7,
        max_tokens: 2000
      });

      return response.data.choices[0].text;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        throw new Error(`DeepSeek API error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  private buildPrompt(toolName: string, params: Record<string, unknown>): string {
    switch (toolName) {
      case 'generate_code':
        return `
### Task: Code Generation
### Language: ${params.language || 'any'}
### Requirements:
${params.prompt}
### Response:
`;

      case 'complete_code':
        return `
### Task: Code Completion
### Context:
${params.code}
### Requirements:
${params.prompt}
### Response:
`;

      case 'optimize_code':
        return `
### Task: Code Optimization
### Target: ${params.target || 'performance'}
### Code:
${params.code}
### Response:
`;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: Error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DeepSeek MCP server running on stdio');
  }
}

const server = new DeepSeekServer();
server.run().catch(console.error);
