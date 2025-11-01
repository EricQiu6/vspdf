/**
 * Tests for ContextKeyExpression parser and evaluator
 */

import { describe, it, expect } from 'vitest';
import { ContextKeyExpression } from '../ContextKeyExpression';

describe('ContextKeyExpression', () => {
  describe('parse', () => {
    it('should parse simple key expression', () => {
      const expr = ContextKeyExpression.parse('editorFocus');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ editorFocus: true })).toBe(true);
      expect(expr!.evaluate({ editorFocus: false })).toBe(false);
      expect(expr!.evaluate({})).toBe(false);
    });

    it('should parse negation expression', () => {
      const expr = ContextKeyExpression.parse('!inputFocus');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ inputFocus: false })).toBe(true);
      expect(expr!.evaluate({ inputFocus: true })).toBe(false);
      expect(expr!.evaluate({})).toBe(true); // undefined is falsy
    });

    it('should parse equality expression', () => {
      const expr = ContextKeyExpression.parse('editorLangId == typescript');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ editorLangId: 'typescript' })).toBe(true);
      expect(expr!.evaluate({ editorLangId: 'javascript' })).toBe(false);
      expect(expr!.evaluate({})).toBe(false);
    });

    it('should parse inequality expression', () => {
      const expr = ContextKeyExpression.parse('viewerType != stub');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ viewerType: 'pdf' })).toBe(true);
      expect(expr!.evaluate({ viewerType: 'stub' })).toBe(false);
    });

    it('should parse greater than expression', () => {
      const expr = ContextKeyExpression.parse('lineNumber > 0');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ lineNumber: 5 })).toBe(true);
      expect(expr!.evaluate({ lineNumber: 0 })).toBe(false);
      expect(expr!.evaluate({ lineNumber: -1 })).toBe(false);
    });

    it('should parse less than or equal expression', () => {
      const expr = ContextKeyExpression.parse('tabCount <= 10');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ tabCount: 5 })).toBe(true);
      expect(expr!.evaluate({ tabCount: 10 })).toBe(true);
      expect(expr!.evaluate({ tabCount: 15 })).toBe(false);
    });

    it('should parse AND expression', () => {
      const expr = ContextKeyExpression.parse('editorFocus && !inputFocus');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ editorFocus: true, inputFocus: false })).toBe(true);
      expect(expr!.evaluate({ editorFocus: true, inputFocus: true })).toBe(false);
      expect(expr!.evaluate({ editorFocus: false, inputFocus: false })).toBe(false);
    });

    it('should parse OR expression', () => {
      const expr = ContextKeyExpression.parse('terminalFocus || panelFocus');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ terminalFocus: true, panelFocus: false })).toBe(true);
      expect(expr!.evaluate({ terminalFocus: false, panelFocus: true })).toBe(true);
      expect(expr!.evaluate({ terminalFocus: false, panelFocus: false })).toBe(false);
    });

    it('should parse complex expression with parentheses', () => {
      const expr = ContextKeyExpression.parse('(editorFocus || terminalFocus) && !inputFocus');
      expect(expr).not.toBeNull();
      expect(
        expr!.evaluate({ editorFocus: true, terminalFocus: false, inputFocus: false })
      ).toBe(true);
      expect(
        expr!.evaluate({ editorFocus: false, terminalFocus: true, inputFocus: false })
      ).toBe(true);
      expect(
        expr!.evaluate({ editorFocus: true, terminalFocus: false, inputFocus: true })
      ).toBe(false);
    });

    it('should parse regex match expression', () => {
      const expr = ContextKeyExpression.parse('resourceExtname =~ /\\.(ts|js)$/');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ resourceExtname: 'file.ts' })).toBe(true);
      expect(expr!.evaluate({ resourceExtname: 'file.js' })).toBe(true);
      expect(expr!.evaluate({ resourceExtname: 'file.pdf' })).toBe(false);
    });

    it('should parse membership expression', () => {
      const expr = ContextKeyExpression.parse('viewColumn in [1, 2, 3]');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ viewColumn: 1 })).toBe(true);
      expect(expr!.evaluate({ viewColumn: 2 })).toBe(true);
      expect(expr!.evaluate({ viewColumn: 4 })).toBe(false);
    });

    it('should return null for invalid syntax', () => {
      expect(ContextKeyExpression.parse('invalid &&')).toBeNull();
      expect(ContextKeyExpression.parse('(unclosed')).toBeNull();
      expect(ContextKeyExpression.parse('')).toBeNull();
    });

    it('should handle string values with quotes', () => {
      const expr = ContextKeyExpression.parse('theme == "dark"');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ theme: 'dark' })).toBe(true);
      expect(expr!.evaluate({ theme: 'light' })).toBe(false);
    });

    it('should handle boolean values', () => {
      const expr = ContextKeyExpression.parse('debugMode == true');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ debugMode: true })).toBe(true);
      expect(expr!.evaluate({ debugMode: false })).toBe(false);
    });

    it('should handle number values', () => {
      const expr = ContextKeyExpression.parse('zoom == 1.5');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ zoom: 1.5 })).toBe(true);
      expect(expr!.evaluate({ zoom: 2.0 })).toBe(false);
    });
  });

  describe('operator precedence', () => {
    it('should respect AND before OR precedence', () => {
      // a || b && c should parse as a || (b && c)
      const expr = ContextKeyExpression.parse('a || b && c');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ a: false, b: true, c: true })).toBe(true);
      expect(expr!.evaluate({ a: false, b: true, c: false })).toBe(false);
      expect(expr!.evaluate({ a: true, b: false, c: false })).toBe(true);
    });

    it('should allow parentheses to override precedence', () => {
      // (a || b) && c
      const expr = ContextKeyExpression.parse('(a || b) && c');
      expect(expr).not.toBeNull();
      expect(expr!.evaluate({ a: true, b: false, c: true })).toBe(true);
      expect(expr!.evaluate({ a: false, b: true, c: true })).toBe(true);
      expect(expr!.evaluate({ a: true, b: false, c: false })).toBe(false);
    });
  });
});
