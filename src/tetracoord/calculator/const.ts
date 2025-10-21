import type { PowerScalar } from "../scalar"
import type { Tetracoordinate, CartesianCoordinate } from "../vector"

export type ExpressionValue = number | PowerScalar | Tetracoordinate | CartesianCoordinate | boolean
/**
 * Used for values like {@linkcode CartesianCoordinate ccoords} that consume a list of components.
 */
export class ExpressionValueCollection {
  constructor(public items: ExpressionValue[]) { }
}
export type ExpressionInnerValue = ExpressionValue | ExpressionValueCollection

export type ExpressionLeaf = ExpressionInnerValue | string | null | undefined
export type ExpressionTree = (ExpressionLeaf | ExpressionTree)[]
