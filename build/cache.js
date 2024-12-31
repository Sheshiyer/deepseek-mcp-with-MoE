export class Cache {
    constructor() {
        this.store = new Map();
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl * 1000) {
            this.store.delete(key);
            return null;
        }
        return entry.result;
    }
    set(key, result, ttl, metadata) {
        this.store.set(key, {
            result,
            timestamp: Date.now(),
            ttl,
            metadata
        });
    }
    getMetadata(key) {
        const entry = this.store.get(key);
        return entry?.metadata || null;
    }
    has(key) {
        return this.get(key) !== null;
    }
    delete(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    // Helper method to generate cache keys for tool chains
    static generateChainKey(steps) {
        return steps.map(step => `${step.toolName}:${JSON.stringify(step.params)}`).join('|');
    }
    // Cleanup expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now - entry.timestamp > entry.ttl * 1000) {
                this.store.delete(key);
            }
        }
    }
}
