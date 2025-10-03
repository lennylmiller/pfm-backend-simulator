/**
 * Serialization utilities for API responses
 * Handles snake_case conversion and special type serialization
 */

/**
 * Convert camelCase keys to snake_case recursively
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function snakeCaseKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeCaseKeys(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = snakeCaseKeys(value);
    }
    return result;
  }

  return obj;
}

/**
 * Serialize BigInt and Decimal types to strings for JSON compatibility
 */
export function serializeSpecialTypes(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeSpecialTypes(item));
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'bigint') {
        result[key] = value.toString();
      } else if (value && typeof value === 'object' && 'toNumber' in value) {
        // Handle Prisma Decimal type
        result[key] = (value as any).toNumber();
      } else {
        result[key] = serializeSpecialTypes(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Complete serialization pipeline: special types → snake_case
 */
export function serialize(data: any): any {
  const typeSerialized = serializeSpecialTypes(data);
  return snakeCaseKeys(typeSerialized);
}

/**
 * Wrap single object in array for frontend compatibility
 */
export function wrapInArray<T>(data: T | null | undefined, key: string): Record<string, T[]> {
  return { [key]: data ? [data] : [] } as Record<string, T[]>;
}
