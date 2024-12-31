# DeepSeek MCP Server

An MCP server implementation that provides code generation and completion capabilities using the DeepSeek API, with support for tool chaining and cost optimization.

## Features

- Code generation with language-specific support
- Code completion with context awareness
- Code optimization with multiple targets
- Tool chaining for complex operations
- Built-in caching for cost optimization
- TypeScript implementation with full type safety

## Tools

### 1. generate_code
Generate code using DeepSeek API with language-specific support.
```json
{
  "name": "generate_code",
  "params": {
    "prompt": "Write a function that sorts an array",
    "language": "typescript",
    "temperature": 0.7
  }
}
```

### 2. complete_code
Get intelligent code completions based on existing context.
```json
{
  "name": "complete_code",
  "params": {
    "code": "function processData(data) {",
    "prompt": "Add input validation and error handling",
    "temperature": 0.7
  }
}
```

### 3. optimize_code
Optimize existing code for performance, memory usage, or readability.
```json
{
  "name": "optimize_code",
  "params": {
    "code": "your code here",
    "target": "performance"
  }
}
```

### 4. execute_chain
Execute a chain of tools in sequence, with context passing between steps.
```json
{
  "name": "execute_chain",
  "params": {
    "steps": [
      {
        "toolName": "generate_code",
        "params": {
          "prompt": "Create a REST API endpoint",
          "language": "typescript"
        }
      },
      {
        "toolName": "optimize_code",
        "params": {
          "target": "performance"
        }
      }
    ]
  }
}
```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Configure your DeepSeek API key in the MCP settings file:
```json
{
  "mcpServers": {
    "deepseek": {
      "command": "node",
      "args": ["/path/to/deepseek-mcp/build/index.js"],
      "env": {
        "DEEPSEEK_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Usage

The server can be used with any MCP-compatible client. Here's an example using the MCP CLI:

```bash
mcp use deepseek generate_code --params '{"prompt": "Write a hello world program", "language": "python"}'
```

## Tool Chaining

Tool chaining allows you to combine multiple operations into a single workflow. Each tool in the chain can access the results of previous tools through the chain context.

Example chain:
1. Generate initial code
2. Complete the code with error handling
3. Optimize the final result

```json
{
  "steps": [
    {
      "toolName": "generate_code",
      "params": {
        "prompt": "Create a user authentication function",
        "language": "typescript"
      }
    },
    {
      "toolName": "complete_code",
      "params": {
        "prompt": "Add input validation and error handling"
      }
    },
    {
      "toolName": "optimize_code",
      "params": {
        "target": "security"
      }
    }
  ]
}
```

## Cost Optimization

The server implements several strategies to optimize API costs:

1. Request caching with TTL
2. Chain result caching
3. Smart prompt construction
4. Metadata tracking for usage analysis

## Development

To start development:

```bash
npm run dev
```

To clean and rebuild:

```bash
npm run rebuild
```

## Requirements

- Node.js >= 18.0.0
- DeepSeek API key
- MCP-compatible client

## License

ISC
