import { ExpressionInnerValue } from "./const"
import { evalExpression } from "."
import { SerialExprCalc } from "../../serializer"
import { EXPR_CALC_ACCESS_OP } from "../symbol"

export type ExprCalcType = 'exprcalc'
export const EXPR_CALC_TYPE: ExprCalcType = 'exprcalc'

/**
 * A method that is compatible as an extension/middleware for {@link evalExpression}.
 */
export class ExpressionCalculator implements SerialExprCalc {
  type = EXPR_CALC_TYPE
  filePath: string

  constructor(filePath: string) {
    if (!filePath) {
      throw new Error(`cannot create expression calculator without reference to source file`)
    }
    this.filePath = filePath
  }

  /**
   * Evaluation/calculation to be performed.
   * @throws {EvalError} Something failed (ex. unsupported arguments).
   * @throws {Error} Subclass does not implement this method.
   */
  eval(_args: ExpressionInnerValue|undefined): ExpressionInnerValue {
    throw new Error(`expression calculator subclass must implement eval`)
  }

  /**
   * @returns A subset of attributes to include for serialization.
   */
  save(): SerialExprCalc {
    return {type: this.type, filePath: this.filePath}
  }

  /**
   * Format expression calculator reference in expression syntax.
   */
  toString(): string {
    return [
      EXPR_CALC_TYPE,
      EXPR_CALC_ACCESS_OP[0],
      this.filePath,
      EXPR_CALC_ACCESS_OP[1]
    ].join('')
  }
}
