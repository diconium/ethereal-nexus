export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private order: Map<K, K>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.order = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move the accessed key to the end to show that it was recently used
    this.order.delete(key);
    this.order.set(key, key);
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Remove the old key to update its position
      this.order.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove the least recently used (LRU) item
      const lruKey = this.order.keys().next().value;
      if (lruKey) {
        this.cache.delete(lruKey);
        this.order.delete(lruKey);
      }
    }
    // Insert the new key-value pair
    this.cache.set(key, value);
    this.order.set(key, key);
  }

  delete(key: K): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.order.delete(key);
    }
  }
}
