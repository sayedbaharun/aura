import { describe, it, expect } from 'vitest';
import { escapeLikeWildcards } from '../storage';

describe('SQL Security - LIKE Wildcard Escaping', () => {
  describe('escapeLikeWildcards', () => {
    it('should escape percent wildcard characters', () => {
      expect(escapeLikeWildcards('%')).toBe('\\%');
      expect(escapeLikeWildcards('100%')).toBe('100\\%');
      expect(escapeLikeWildcards('%secret%')).toBe('\\%secret\\%');
    });

    it('should escape underscore wildcard characters', () => {
      expect(escapeLikeWildcards('_')).toBe('\\_');
      expect(escapeLikeWildcards('test_value')).toBe('test\\_value');
      expect(escapeLikeWildcards('a_b_c')).toBe('a\\_b\\_c');
    });

    it('should escape backslashes before other characters', () => {
      expect(escapeLikeWildcards('\\')).toBe('\\\\');
      expect(escapeLikeWildcards('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should handle mixed wildcard characters', () => {
      expect(escapeLikeWildcards('%_test')).toBe('\\%\\_test');
      expect(escapeLikeWildcards('user_%_data')).toBe('user\\_\\%\\_data');
    });

    it('should handle backslashes with wildcards', () => {
      expect(escapeLikeWildcards('\\%')).toBe('\\\\\\%');
      expect(escapeLikeWildcards('\\_')).toBe('\\\\\\_');
    });

    it('should return normal strings unchanged (except backslashes)', () => {
      expect(escapeLikeWildcards('hello')).toBe('hello');
      expect(escapeLikeWildcards('search query')).toBe('search query');
      expect(escapeLikeWildcards('Test123')).toBe('Test123');
    });

    it('should handle empty string', () => {
      expect(escapeLikeWildcards('')).toBe('');
    });

    it('should prevent wildcard injection attack patterns', () => {
      // Attack: search for "%" to match all documents
      const allDocsAttack = escapeLikeWildcards('%');
      expect(allDocsAttack).not.toBe('%');
      expect(allDocsAttack).toBe('\\%');

      // Attack: single character wildcard probing
      const probeAttack = escapeLikeWildcards('_a');
      expect(probeAttack).not.toBe('_a');
      expect(probeAttack).toBe('\\_a');

      // Attack: combination wildcard injection
      const combinedAttack = escapeLikeWildcards('%admin%');
      expect(combinedAttack).toBe('\\%admin\\%');
    });
  });
});

describe('SQL Security - Safe Patterns', () => {
  it('documents safe patterns for LIKE queries', () => {
    // This test documents the expected usage pattern
    const userInput = 'test%query';
    const escaped = escapeLikeWildcards(userInput);

    // Safe pattern: wrap escaped input with wildcards
    const safePattern = `%${escaped}%`;
    expect(safePattern).toBe('%test\\%query%');

    // The outer % are intentional wildcards for substring search
    // The inner \\% is escaped to search for literal %
  });
});
