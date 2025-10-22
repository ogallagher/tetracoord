import { ExpressionInnerValue } from "./const"
import { evalExpression } from "."
import { Serializable } from "../../serializer"

/**
 * A method that is compatible as an extension/middleware for {@link evalExpression}.
 */
export abstract class ExpressionCalculator implements Serializable {
  type = 'exprcalc'
  filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  /**
   * Evaluation/calculation to be performed.
   * @throws {EvalError} Something failed (ex. unsupported arguments).
   */
  abstract eval(args: ExpressionInnerValue): ExpressionInnerValue
}
