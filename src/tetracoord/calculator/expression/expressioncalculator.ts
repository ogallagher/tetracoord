import { ExpressionInnerValue } from "./const"
import { evalExpression } from "."

/**
 * A method that is compatible as an extension/middleware for {@link evalExpression}.
 */
export interface ExpressionCalculator {
  (args: ExpressionInnerValue): ExpressionInnerValue
}