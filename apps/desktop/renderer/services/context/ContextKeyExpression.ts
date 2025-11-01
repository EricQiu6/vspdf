/**
 * Context Key Expression Parser and Evaluator
 *
 * Parses and evaluates "when" clause expressions for conditional keybindings.
 * Supports VS Code-style expression syntax.
 *
 * Grammar:
 *   expr     := orExpr
 *   orExpr   := andExpr ('||' andExpr)*
 *   andExpr  := primary ('&&' primary)*
 *   primary  := '!' primary | '(' expr ')' | term
 *   term     := key operator value | key
 *   operator := '==' | '!=' | '<' | '<=' | '>' | '>=' | '=~' | 'in'
 */

import type { ContextKeyMap, ContextKeyValue } from './types.js';

/**
 * Abstract base class for context key expressions
 */
export abstract class ContextKeyExpression {
  /**
   * Evaluate this expression against a context
   * @param context Context key map
   * @returns True if expression matches
   */
  abstract evaluate(context: ContextKeyMap): boolean;

  /**
   * Parse a when clause string into an expression
   * @param when When clause string
   * @returns Parsed expression or null if invalid
   */
  static parse(when: string): ContextKeyExpression | null {
    if (!when || typeof when !== 'string') {
      return null;
    }

    try {
      const parser = new ContextKeyExpressionParser(when);
      return parser.parse();
    } catch {
      return null;
    }
  }
}

/**
 * Expression that checks if a key exists and is truthy
 */
class ContextKeyDefinedExpr extends ContextKeyExpression {
  constructor(private key: string) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    const value = context[this.key];
    return value !== undefined && value !== false && value !== 0 && value !== '';
  }
}

/**
 * Expression that checks equality
 */
class ContextKeyEqualsExpr extends ContextKeyExpression {
  constructor(
    private key: string,
    private value: ContextKeyValue
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    return context[this.key] === this.value;
  }
}

/**
 * Expression that checks inequality
 */
class ContextKeyNotEqualsExpr extends ContextKeyExpression {
  constructor(
    private key: string,
    private value: ContextKeyValue
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    return context[this.key] !== this.value;
  }
}

/**
 * Expression that checks greater than
 */
class ContextKeyGreaterExpr extends ContextKeyExpression {
  constructor(
    private key: string,
    private value: number
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    const actual = context[this.key];
    return typeof actual === 'number' && actual > this.value;
  }
}

/**
 * Expression that checks greater than or equal
 */
class ContextKeyGreaterEqualsExpr extends ContextKeyExpression {
  constructor(
    private key: string,
    private value: number
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    const actual = context[this.key];
    return typeof actual === 'number' && actual >= this.value;
  }
}

/**
 * Expression that checks less than
 */
class ContextKeySmallerExpr extends ContextKeyExpression {
  constructor(
    private key: string,
    private value: number
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    const actual = context[this.key];
    return typeof actual === 'number' && actual < this.value;
  }
}

/**
 * Expression that checks less than or equal
 */
class ContextKeySmallerEqualsExpr extends ContextKeyExpression {
  constructor(
    private key: string,
    private value: number
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    const actual = context[this.key];
    return typeof actual === 'number' && actual <= this.value;
  }
}

/**
 * Expression that checks regex match
 */
class ContextKeyRegexExpr extends ContextKeyExpression {
  private regex: RegExp;

  constructor(
    private key: string,
    pattern: string
  ) {
    super();
    // Parse regex pattern (remove surrounding slashes if present)
    // Use non-greedy match to handle escaped slashes in pattern
    const match = pattern.match(/^\/(.+?)\/([gimuy]*)$/);
    if (match) {
      this.regex = new RegExp(match[1], match[2]);
    } else {
      this.regex = new RegExp(pattern);
    }
  }

  evaluate(context: ContextKeyMap): boolean {
    const value = context[this.key];
    return typeof value === 'string' && this.regex.test(value);
  }
}

/**
 * Expression that checks membership in array
 */
class ContextKeyInExpr extends ContextKeyExpression {
  constructor(
    private key: string,
    private values: ContextKeyValue[]
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    const value = context[this.key];
    return this.values.includes(value);
  }
}

/**
 * Expression that negates another expression
 */
class ContextKeyNotExpr extends ContextKeyExpression {
  constructor(private expr: ContextKeyExpression) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    return !this.expr.evaluate(context);
  }
}

/**
 * Expression that ANDs two expressions
 */
class ContextKeyAndExpr extends ContextKeyExpression {
  constructor(
    private left: ContextKeyExpression,
    private right: ContextKeyExpression
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    return this.left.evaluate(context) && this.right.evaluate(context);
  }
}

/**
 * Expression that ORs two expressions
 */
class ContextKeyOrExpr extends ContextKeyExpression {
  constructor(
    private left: ContextKeyExpression,
    private right: ContextKeyExpression
  ) {
    super();
  }

  evaluate(context: ContextKeyMap): boolean {
    return this.left.evaluate(context) || this.right.evaluate(context);
  }
}

/**
 * Tokenizer for parsing when clauses
 */
class ContextKeyExpressionParser {
  private pos = 0;

  constructor(private input: string) {
    this.input = input.trim();
  }

  /**
   * Parse the input string into an expression
   */
  parse(): ContextKeyExpression {
    const expr = this.parseOrExpr();
    if (this.pos < this.input.length) {
      throw new Error(`Unexpected characters at position ${this.pos}`);
    }
    return expr;
  }

  /**
   * Parse OR expression (lowest precedence)
   */
  private parseOrExpr(): ContextKeyExpression {
    let left = this.parseAndExpr();

    while (this.peek() === '||') {
      this.consume('||');
      const right = this.parseAndExpr();
      left = new ContextKeyOrExpr(left, right);
    }

    return left;
  }

  /**
   * Parse AND expression
   */
  private parseAndExpr(): ContextKeyExpression {
    let left = this.parsePrimary();

    while (this.peek() === '&&') {
      this.consume('&&');
      const right = this.parsePrimary();
      left = new ContextKeyAndExpr(left, right);
    }

    return left;
  }

  /**
   * Parse primary expression (NOT, parentheses, or term)
   */
  private parsePrimary(): ContextKeyExpression {
    this.skipWhitespace();

    // Handle NOT
    if (this.peek() === '!') {
      this.consume('!');
      return new ContextKeyNotExpr(this.parsePrimary());
    }

    // Handle parentheses
    if (this.peek() === '(') {
      this.consume('(');
      const expr = this.parseOrExpr();
      this.consume(')');
      return expr;
    }

    // Parse term
    return this.parseTerm();
  }

  /**
   * Parse term (key with optional operator and value)
   */
  private parseTerm(): ContextKeyExpression {
    this.skipWhitespace();

    const key = this.parseIdentifier();
    this.skipWhitespace();

    // Check for operator
    const operator = this.peekOperator();

    if (!operator) {
      // Just a key - check if it's truthy
      return new ContextKeyDefinedExpr(key);
    }

    this.consume(operator);
    this.skipWhitespace();

    // Parse value based on operator
    if (operator === '=~') {
      const pattern = this.parseRegex();
      return new ContextKeyRegexExpr(key, pattern);
    } else if (operator === 'in') {
      const values = this.parseArray();
      return new ContextKeyInExpr(key, values);
    } else {
      const value = this.parseValue();

      switch (operator) {
        case '==':
          return new ContextKeyEqualsExpr(key, value);
        case '!=':
          return new ContextKeyNotEqualsExpr(key, value);
        case '>':
          return new ContextKeyGreaterExpr(key, value as number);
        case '>=':
          return new ContextKeyGreaterEqualsExpr(key, value as number);
        case '<':
          return new ContextKeySmallerExpr(key, value as number);
        case '<=':
          return new ContextKeySmallerEqualsExpr(key, value as number);
        default:
          throw new Error(`Unknown operator: ${operator}`);
      }
    }
  }

  /**
   * Parse identifier (key name)
   */
  private parseIdentifier(): string {
    this.skipWhitespace();

    const start = this.pos;
    while (
      this.pos < this.input.length &&
      /[a-zA-Z0-9_.]/.test(this.input[this.pos])
    ) {
      this.pos++;
    }

    if (start === this.pos) {
      throw new Error(`Expected identifier at position ${this.pos}`);
    }

    return this.input.substring(start, this.pos);
  }

  /**
   * Parse value (string, number, or boolean)
   */
  private parseValue(): ContextKeyValue {
    this.skipWhitespace();

    // String (single or double quotes)
    if (this.input[this.pos] === '"' || this.input[this.pos] === "'") {
      return this.parseString();
    }

    // Boolean
    if (this.input.substring(this.pos).startsWith('true')) {
      this.pos += 4;
      return true;
    }
    if (this.input.substring(this.pos).startsWith('false')) {
      this.pos += 5;
      return false;
    }

    // Number (must start with digit or minus followed by digit)
    if (/^-?[0-9]/.test(this.input.substring(this.pos))) {
      const start = this.pos;
      if (this.input[this.pos] === '-') {
        this.pos++;
      }
      while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos])) {
        this.pos++;
      }
      const numStr = this.input.substring(start, this.pos);
      return parseFloat(numStr);
    }

    // Unquoted identifier (treat as string, like VS Code)
    const start = this.pos;
    while (
      this.pos < this.input.length &&
      /[a-zA-Z0-9_.-]/.test(this.input[this.pos])
    ) {
      this.pos++;
    }

    if (start === this.pos) {
      throw new Error(`Expected value at position ${this.pos}`);
    }

    return this.input.substring(start, this.pos);
  }

  /**
   * Parse quoted string
   */
  private parseString(): string {
    const quote = this.input[this.pos];
    this.pos++; // Skip opening quote

    const start = this.pos;
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\') {
        this.pos++; // Skip escape character
      }
      this.pos++;
    }

    if (this.pos >= this.input.length) {
      throw new Error('Unterminated string');
    }

    const value = this.input.substring(start, this.pos);
    this.pos++; // Skip closing quote

    return value;
  }

  /**
   * Parse regex pattern
   */
  private parseRegex(): string {
    // Regex can be quoted or in /pattern/flags format
    if (this.input[this.pos] === '"' || this.input[this.pos] === "'") {
      return this.parseString();
    }

    if (this.input[this.pos] === '/') {
      const start = this.pos;
      this.pos++; // Skip opening /

      while (this.pos < this.input.length && this.input[this.pos] !== '/') {
        if (this.input[this.pos] === '\\') {
          this.pos++; // Skip escape
        }
        this.pos++;
      }

      if (this.pos >= this.input.length) {
        throw new Error('Unterminated regex');
      }

      this.pos++; // Skip closing /

      // Parse flags
      while (this.pos < this.input.length && /[gimuy]/.test(this.input[this.pos])) {
        this.pos++;
      }

      return this.input.substring(start, this.pos);
    }

    throw new Error(`Expected regex at position ${this.pos}`);
  }

  /**
   * Parse array literal [value1, value2, ...]
   */
  private parseArray(): ContextKeyValue[] {
    this.consume('[');
    this.skipWhitespace();

    const values: ContextKeyValue[] = [];

    while (this.input[this.pos] !== ']') {
      values.push(this.parseValue());
      this.skipWhitespace();

      if (this.input[this.pos] === ',') {
        this.consume(',');
        this.skipWhitespace();
      }
    }

    this.consume(']');
    return values;
  }

  /**
   * Peek at the next operator
   */
  private peekOperator(): string | null {
    const operators = ['==', '!=', '>=', '<=', '>', '<', '=~', 'in'];
    for (const op of operators) {
      if (this.input.substring(this.pos, this.pos + op.length) === op) {
        return op;
      }
    }
    return null;
  }

  /**
   * Peek at the next token without consuming
   */
  private peek(): string {
    this.skipWhitespace();
    if (this.pos >= this.input.length) return '';

    // Check for two-character tokens
    const twoChar = this.input.substring(this.pos, this.pos + 2);
    if (twoChar === '&&' || twoChar === '||') {
      return twoChar;
    }

    return this.input[this.pos];
  }

  /**
   * Consume a specific token
   */
  private consume(token: string): void {
    this.skipWhitespace();
    if (this.input.substring(this.pos, this.pos + token.length) !== token) {
      throw new Error(`Expected '${token}' at position ${this.pos}`);
    }
    this.pos += token.length;
  }

  /**
   * Skip whitespace
   */
  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }
}
