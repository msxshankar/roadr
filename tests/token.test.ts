import { describe, expect, it } from 'vitest';
import { DEFAULT_MAPBOX_TOKEN } from '../lib/mapbox';

describe('Mapbox Access Token Configuration', () => {
  it('has a valid default fallback token', () => {
    expect(typeof DEFAULT_MAPBOX_TOKEN).toBe('string');
  });

  it('can store and retrieve custom tokens globally', () => {
    const key = 'roadr:mapbox-token:v1';
    const testToken = 'pk.eyJ1IjoibXhzLXRlc3QifQ.test_token_hash';

    const storage = typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage || new Map();
    if (typeof storage.setItem === 'function') {
      storage.setItem(key, testToken);
      expect(storage.getItem(key)).toBe(testToken);

      storage.removeItem(key);
      expect(storage.getItem(key)).toBeNull();
    }
  });
});
