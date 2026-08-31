import { describe, expect, test } from "vitest";
import { evaluateArithmetic } from "./arithmetic";

describe("evaluateArithmetic", () => {
  test("plain number", () => {
    expect(evaluateArithmetic("12.50")).toBe(12.5);
  });

  test("addition and subtraction", () => {
    expect(evaluateArithmetic("12.50+3.25")).toBeCloseTo(15.75);
    expect(evaluateArithmetic("20-4.5")).toBeCloseTo(15.5);
  });

  test("precedence and parentheses", () => {
    expect(evaluateArithmetic("2+3*4")).toBe(14);
    expect(evaluateArithmetic("(2+3)*4")).toBe(20);
  });

  test("leading minus", () => {
    expect(evaluateArithmetic("-5+2")).toBe(-3);
  });

  test("invalid input", () => {
    expect(evaluateArithmetic("")).toBeNull();
    expect(evaluateArithmetic("12+")).toBeNull();
    expect(evaluateArithmetic("12a")).toBeNull();
    expect(evaluateArithmetic("1/0")).toBeNull(); // Infinity is not a valid amount
  });
});
