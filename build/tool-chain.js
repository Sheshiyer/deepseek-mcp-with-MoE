import { Cache } from './cache';
export class ToolChainManager {
    constructor() {
        this.tools = new Map();
        this.cache = new Cache();
    }
    registerTool(config) {
        this.tools.set(config.name, config);
    }
    async executeChain(chain) {
        const results = [];
        const context = {
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
            }
            catch (error) {
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
            }
            catch (error) {
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
    async executeStep(step, context) {
        const tool = this.tools.get(step.toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${step.toolName}`);
        }
        // Validate tool requirements
        if (tool.requiresPrevious && context.previousResults.length === 0) {
            throw new Error(`Tool ${step.toolName} requires previous results`);
        }
        // Validate input parameters
        this.validateParams(step.params, tool.inputSchema);
        // Check step-level cache
        const stepKey = `${step.toolName}:${JSON.stringify(step.params)}`;
        const cachedResult = this.cache.get(stepKey);
        if (cachedResult) {
            try {
                return JSON.parse(cachedResult);
            }
            catch (error) {
                console.error('Error parsing cached step result:', error);
            }
        }
        try {
            // Execute tool with context
            const result = {
                success: true,
                result: await this.executeTool(tool, step.params, context),
                metadata: step.metadata
            };
            // Cache successful results
            this.cache.set(stepKey, JSON.stringify(result), 3600); // 1 hour TTL
            return result;
        }
        catch (error) {
            return {
                success: false,
                result: null,
                error: error instanceof Error ? error.message : 'Unknown error',
                metadata: step.metadata
            };
        }
    }
    async executeTool(tool, params, context) {
        // This would be implemented by the specific tool handler
        throw new Error('Tool execution not implemented');
    }
    validateParams(params, schema) {
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
    addStep(chain, step) {
        chain.steps.push(step);
    }
    removeStep(chain, index) {
        chain.steps.splice(index, 1);
    }
    clearChain(chain) {
        chain.steps = [];
        chain.context = { previousResults: [], metadata: {} };
    }
}
