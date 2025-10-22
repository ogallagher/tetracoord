import type { PowerScalar } from "../../scalar"
import type { Tetracoordinate, CartesianCoordinate } from "../../vector"

export type ExpressionPrimitiveValue = number | boolean
export type ExpressionValue = ExpressionPrimitiveValue | PowerScalar | Tetracoordinate | CartesianCoordinate
/**
 * Used for values like {@linkcode CartesianCoordinate ccoords} that consume a list of components.
 * Not simply a list of values in order to more easily/uniquely identify the type.
 */
export class ExpressionValueCollection {
  constructor(public items: ExpressionValue[]) { }
}
export type ExpressionInnerValue = ExpressionValue | ExpressionValueCollection

export type ExpressionLeaf = ExpressionInnerValue | string | null | undefined
export type ExpressionTree = (ExpressionLeaf | ExpressionTree)[]
