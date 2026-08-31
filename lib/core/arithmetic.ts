// Lets the amount field take "12.50+3.25" the way a calculator would,
// without handing user input to eval()/Function(). +, -, *, / and
// parentheses only; standard precedence, left-to-right.

type Token = { kind: "num"; value: number } | { kind: "op"; value: "+" | "-" | "*" | "/" | "(" | ")" };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === " ") {
      i++;
    } else if ("+-*/()".includes(c)) {
      tokens.push({ kind: "op", value: c as "+" | "-" | "*" | "/" | "(" | ")" });
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const value = Number(input.slice(i, j));
      if (!Number.isFinite(value)) return null;
      tokens.push({ kind: "num", value });
      i = j;
    } else {
      return null;
    }
  }
  return tokens;
}

// Recursive descent: expr -> term (('+'|'-') term)*, term -> unary (('*'|'/') unary)*,
// unary -> '-'? primary, primary -> number | '(' expr ')'
function parse(tokens: Token[]): number | null {
  let pos = 0;
  const peek = () => tokens[pos];

  function primary(): number | null {
    const t = peek();
    if (!t) return null;
    if (t.kind === "num") {
      pos++;
      return t.value;
    }
    if (t.kind === "op" && t.value === "(") {
      pos++;
      const v = expr();
      if (v === null) return null;
      const close = peek();
      if (!close || close.kind !== "op" || close.value !== ")") return null;
      pos++;
      return v;
    }
    return null;
  }

  function unary(): number | null {
    const t = peek();
    if (t && t.kind === "op" && (t.value === "-" || t.value === "+")) {
      pos++;
      const v = unary();
      if (v === null) return null;
      return t.value === "-" ? -v : v;
    }
    return primary();
  }

  function term(): number | null {
    let v = unary();
    if (v === null) return null;
    for (;;) {
      const t = peek();
      if (!t || t.kind !== "op" || (t.value !== "*" && t.value !== "/")) return v;
      pos++;
      const rhs = unary();
      if (rhs === null) return null;
      v = t.value === "*" ? v * rhs : v / rhs;
    }
  }

  function expr(): number | null {
    let v = term();
    if (v === null) return null;
    for (;;) {
      const t = peek();
      if (!t || t.kind !== "op" || (t.value !== "+" && t.value !== "-")) return v;
      pos++;
      const rhs = term();
      if (rhs === null) return null;
      v = t.value === "+" ? v + rhs : v - rhs;
    }
  }

  const result = expr();
  if (result === null || pos !== tokens.length) return null;
  return result;
}

/** Evaluates a basic arithmetic expression ("12.50+3.25×2" written as "*") to a number, or null if invalid. */
export function evaluateArithmetic(input: string): number | null {
  const cleaned = input.trim();
  if (cleaned === "") return null;
  const tokens = tokenize(cleaned);
  if (!tokens || tokens.length === 0) return null;
  const result = parse(tokens);
  return result === null || !Number.isFinite(result) ? null : result;
}
