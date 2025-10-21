import type { Pt } from "pts-math"
import { VAR_ANS_ID, VarCtxId } from "../calculator/symbol"
import { ByteLevelOrder, PowerScalar, RadixType, RawScalar, ScalarType, ScalarTypePower, Sign } from "../scalar"
import type { VectorTypeCC, VectorTypeTC } from "../vector"
import type { ExpressionPrimitiveValue } from "../calculator/const"

export interface Serializable {
  /**
   * Indicator of the serializable object's type.
   */
  type: string
}
export type SerialBytes = number[]
export interface SerialPowerScalar extends Serializable {
  type: ScalarTypePower
  /**
   * If decimal, raw positive integer. If quaternary or binary, byte array.
   */
  digits: RawScalar | SerialBytes
  /**
   * Radix determines values (formatted digit) vs bits per level.
   */
  radix: RadixType
  /**
   * Number of levels to shift the decimal point. Level shift is bit shift multiplied by bits per level, determined by the radix.
   */
  power: number
  /**
   * The sign as `1` or `-1`.
   */
  sign: Sign
  /**
   * Whether least significant digit repeats infinitely as fractional digits after decimal point.
   */
  irrational: boolean
  /**
   * Order that levels are stored within each byte, and that the bytes are stored in the byte array.
   */
  levelOrder: ByteLevelOrder
}
export interface SerialTetracoord extends Serializable {
  type: VectorTypeTC
  /**
   * Byte array (binary) representation of this tcoord. 
   * 
   * Each tcoord digit/place value is represented with 2 bits.
   * Each byte represents up to 4 tcoord digits (8/2=4).
   */
  value: PowerScalar | SerialPowerScalar
  /**
   * Number of significant quad digits in this tcoord (can be less than num_bytes*4).
   */
  num_levels: number
}
export interface SerialCartesianCoord extends Serializable {
  type: VectorTypeCC
  /**
   * Vector value expressed in simple scalar numbers.
   */
  v?: Pt
  /**
   * Vector x component as a power scalar.
   */
  x: PowerScalar|SerialPowerScalar
  /**
   * Vector x component as a power scalar.
   */
  y: PowerScalar|SerialPowerScalar
}
export type SerialExprVal = ExpressionPrimitiveValue | SerialPowerScalar | SerialTetracoord | SerialCartesianCoord
export interface SerialVarCtx extends Serializable {
  type: VarCtxId
  /**
   * Always stores latest expression result/answer.
   */
  [VAR_ANS_ID]: SerialExprVal
  /**
   * Other attributes added at runtime.
   */
  values: {
    [key: string]: SerialExprVal | VarCtxId
  }
}
