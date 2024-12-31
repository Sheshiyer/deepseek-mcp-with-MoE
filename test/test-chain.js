#!/usr/bin/env node

// Example test chain for the DeepSeek MCP server
const chain = {
  steps: [
    {
      toolName: 'generate_code',
      params: {
        prompt: 'Create a simple Express.js server with one GET endpoint that returns "Hello World"',
        language: 'typescript',
        temperature: 0.7
      }
    },
    {
      toolName: 'optimize_code',
      params: {
        target: 'performance'
      }
    }
  ]
};

// Print the chain configuration
console.log('Test Chain Configuration:');
console.log(JSON.stringify(chain, null, 2));

// Instructions for testing
console.log('\nTo test this chain, run:');
console.log('mcp use deepseek execute_chain --params \'{"steps": ' + JSON.stringify(chain.steps) + '}\'');

// Note about environment setup
console.log('\nMake sure to:');
console.log('1. Set DEEPSEEK_API_KEY in your MCP settings');
console.log('2. Add the DeepSeek MCP server to your MCP configuration');
console.log('3. Start the server using: npm start');
