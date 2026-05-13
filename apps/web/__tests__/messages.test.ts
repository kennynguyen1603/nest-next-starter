import { describe, it, expect } from 'vitest';
import en from '../messages/en.json';
import vi from '../messages/vi.json';

type NestedObject = { [key: string]: string | NestedObject };

function collectLeafKeys(obj: NestedObject, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' ? collectLeafKeys(value, fullKey) : [fullKey];
  });
}

describe('i18n messages', () => {
  const enKeys = collectLeafKeys(en as NestedObject);
  const viKeys = collectLeafKeys(vi as NestedObject);

  it('vi.json has the same number of keys as en.json', () => {
    expect(viKeys.length).toBe(enKeys.length);
  });

  it.each(enKeys)('vi.json contains key "%s"', (key) => {
    expect(viKeys).toContain(key);
  });

  it('en.json contains no keys missing from vi.json', () => {
    const missing = enKeys.filter((k) => !viKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it('vi.json contains no extra keys not in en.json', () => {
    const extra = viKeys.filter((k) => !enKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it('all vi.json leaf values are non-empty strings', () => {
    const empty = viKeys.filter((key) => {
      const parts = key.split('.');
      let node: NestedObject | string = vi as NestedObject;
      for (const part of parts) {
        node = (node as NestedObject)[part] as NestedObject | string;
      }
      return typeof node !== 'string' || node.trim() === '';
    });
    expect(empty).toEqual([]);
  });
});
