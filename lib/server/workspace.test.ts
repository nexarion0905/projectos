import { describe, expect, it } from 'vitest';
import { isUserId, isUuid, isWorkspaceName } from './workspace';
import { safeObjectKey } from './storage';

describe('Neon backend input boundaries', () => {
  it('accepts only bounded workspace names and UUIDs', () => {
    expect(isWorkspaceName('Research team')).toBe(true);
    expect(isWorkspaceName('')).toBe(false);
    expect(isWorkspaceName('x'.repeat(121))).toBe(false);
    expect(isUuid('00000000-0000-4000-8000-000000000000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUserId('neon-user-123')).toBe(true);
    expect(isUserId('user with spaces')).toBe(false);
  });

  it('rejects object-key traversal and unsafe characters', () => {
    expect(safeObjectKey('documents/brief.pdf')).toBe('documents/brief.pdf');
    expect(() => safeObjectKey('../private.txt')).toThrow();
    expect(() => safeObjectKey('/absolute.txt')).toThrow();
    expect(() => safeObjectKey('documents\\private.txt')).toThrow();
    expect(() => safeObjectKey('documents/<script>.txt')).toThrow();
  });
});

