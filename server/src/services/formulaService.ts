// Safe expression parser for DAX-Lite measures. NO eval().
// Supports: SUM(col), AVG(col), COUNT(col), MIN(col), MAX(col), DISTINCTCOUNT(col),
//           arithmetic operators (+, -, *, /), parentheses, numeric literals.

export type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'aggFunc'; fn: string; arg: string }
  | { kind: 'binop'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'unary'; op: string; operand: ASTNode };

type Token =
  | { type: 'number'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }
  | { type: 'op'; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_ ]/.test(expr[i]) && expr[i] !== '(') {
        id += expr[i++];
      }
      tokens.push({ type: 'ident', value: id.trim() });
      continue;
    }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma' }); i++; continue; }
    if (['+', '-', '*', '/'].includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) { this.tokens = tokens; }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  parse(): ASTNode {
    const node = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token at position ${this.pos}`);
    }
    return node;
  }

  private parseExpr(): ASTNode { return this.parseAddSub(); }

  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (this.peek()?.type === 'op' && (this.peek() as { value: string }).value.match(/[+\-]/)) {
      const op = (this.consume() as { value: string }).value;
      const right = this.parseMulDiv();
      left = { kind: 'binop', op, left, right };
    }
    return left;
  }

  private parseMulDiv(): ASTNode {
    let left = this.parseUnary();
    while (this.peek()?.type === 'op' && (this.peek() as { value: string }).value.match(/[*\/]/)) {
      const op = (this.consume() as { value: string }).value;
      const right = this.parseUnary();
      left = { kind: 'binop', op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.peek()?.type === 'op' && (this.peek() as { value: string }).value === '-') {
      this.consume();
      return { kind: 'unary', op: '-', operand: this.parsePrimary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of expression');

    if (tok.type === 'number') {
      this.consume();
      return { kind: 'number', value: (tok as { value: number }).value };
    }

    if (tok.type === 'lparen') {
      this.consume();
      const inner = this.parseExpr();
      if (this.peek()?.type !== 'rparen') throw new Error('Expected closing parenthesis');
      this.consume();
      return inner;
    }

    if (tok.type === 'ident') {
      const fnName = (tok as { value: string }).value.toUpperCase();
      this.consume();
      // Check if followed by lparen — it's a function call
      if (this.peek()?.type === 'lparen') {
        this.consume(); // consume (
        const knownFns = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCTCOUNT'];
        if (!knownFns.includes(fnName)) {
          throw new Error(`Unknown function: ${fnName}. Supported: ${knownFns.join(', ')}`);
        }
        // Consume column name (ident inside parens)
        const argTok = this.consume();
        let colName: string;
        if (argTok.type === 'ident') {
          colName = (argTok as { value: string }).value;
        } else if (argTok.type === 'number') {
          colName = String((argTok as { value: number }).value);
        } else {
          throw new Error(`Expected column name inside ${fnName}()`);
        }
        if (this.peek()?.type !== 'rparen') throw new Error(`Expected ) after ${fnName}(${colName}`);
        this.consume();
        return { kind: 'aggFunc', fn: fnName, arg: colName };
      }
      // Bare identifier — treat as 0 (not a column reference in simple mode)
      throw new Error(`Unexpected identifier: ${(tok as { value: string }).value}. Use SUM(), AVG(), etc.`);
    }

    throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
  }
}

export function parseExpression(expr: string): ASTNode {
  const tokens = tokenize(expr.trim());
  if (tokens.length === 0) throw new Error('Empty expression');
  return new Parser(tokens).parse();
}

export function evaluateExpression(ast: ASTNode, rows: Record<string, unknown>[]): number {
  switch (ast.kind) {
    case 'number': return ast.value;
    case 'unary': return ast.op === '-' ? -evaluateExpression(ast.operand, rows) : evaluateExpression(ast.operand, rows);
    case 'binop': {
      const l = evaluateExpression(ast.left, rows);
      const r = evaluateExpression(ast.right, rows);
      switch (ast.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? 0 : l / r;
        default: return 0;
      }
    }
    case 'aggFunc': {
      const col = ast.arg;
      switch (ast.fn) {
        case 'SUM': return rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
        case 'AVG': {
          const vals = rows.map((r) => Number(r[col]) || 0);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        }
        case 'COUNT': return rows.length;
        case 'MIN': return rows.length ? Math.min(...rows.map((r) => Number(r[col]) || 0)) : 0;
        case 'MAX': return rows.length ? Math.max(...rows.map((r) => Number(r[col]) || 0)) : 0;
        case 'DISTINCTCOUNT': return new Set(rows.map((r) => String(r[col] ?? ''))).size;
        default: return 0;
      }
    }
  }
}

export function validateExpression(
  expr: string,
  schema: Array<{ name: string; type: string }>
): { valid: boolean; errors: string[] } {
  try {
    const ast = parseExpression(expr);
    const errors: string[] = [];
    checkColumnRefs(ast, schema, errors);
    return { valid: errors.length === 0, errors };
  } catch (e) {
    return { valid: false, errors: [(e as Error).message] };
  }
}

function checkColumnRefs(
  ast: ASTNode,
  schema: Array<{ name: string; type: string }>,
  errors: string[]
): void {
  switch (ast.kind) {
    case 'aggFunc': {
      const exists = schema.some((c) => c.name === ast.arg);
      if (!exists) errors.push(`Column not found: ${ast.arg}`);
      break;
    }
    case 'binop':
      checkColumnRefs(ast.left, schema, errors);
      checkColumnRefs(ast.right, schema, errors);
      break;
    case 'unary':
      checkColumnRefs(ast.operand, schema, errors);
      break;
    case 'number': break;
  }
}
