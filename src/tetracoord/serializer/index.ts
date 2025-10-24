import { PowerScalar } from "../scalar"
import { ScalarType } from "../scalar/const"
import type { PowerScalarConstructorIn } from "../scalar/powerscalar"
import { Tetracoordinate } from "../vector/tetracoordinate"
import { VectorType } from "../vector/const"
import type { SerialCartesianCoord, SerialExprCalc, SerialExprVal, Serializable, SerialPowerScalar, SerialTetracoord } from "./const"
import { CartesianCoordinate } from "../vector"
import type { ExpressionPrimitiveValue, ExpressionValue } from "../calculator/expression/const"
import { EXPR_CALC_TYPE, ExpressionCalculator } from "../calculator/expression/expressioncalculator"
import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * @param val Expression value instance that can be serialized.
 * @returns An object whose properties can be passed directly to {@linkcode JSON.stringify}.
 */
export function serialize(val: SerialExprVal) {
  if (val === undefined || val === null) {
    // allow null in serialized file to show attributes without values like var.$ans
    return null
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return val
  }

  switch (val.type) {
    case ScalarType.PowerScalar:
      const ps = (val as PowerScalar).clone() as SerialPowerScalar

      if (typeof ps.digits !== 'number') {
        ps.digits = [...ps.digits.values()]
      }
      return ps

    case VectorType.TCoord:
      const tc = (val as Tetracoordinate).clone() as SerialTetracoord
      tc.value = serialize(tc.value) as SerialPowerScalar
      return tc

    case VectorType.CCoord:
      const cc = (val as CartesianCoordinate).clone() as SerialCartesianCoord
      cc.v = undefined
      cc.x = serialize(cc.x) as SerialPowerScalar
      cc.y = serialize(cc.y) as SerialPowerScalar
      return cc

    case EXPR_CALC_TYPE:
      return (val as ExpressionCalculator).save()

    default:
      throw new Error(`failed to serialize ${val}=${JSON.stringify(val)}`)
  }
}

export async function deserialize(obj: Serializable|ExpressionPrimitiveValue): Promise<ExpressionValue> {
  if (obj === null || obj === undefined) {
    // don't load var context members that have no value
    return undefined
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }

  switch (obj.type) {
    case ScalarType.PowerScalar:
      const ps = obj as SerialPowerScalar
      if (typeof ps.digits !== 'number') {
        ps.digits = new Uint8Array(ps.digits)
      }
      return new PowerScalar(ps as PowerScalarConstructorIn)

    case VectorType.TCoord:
      const tc = obj as SerialTetracoord
      tc.value = await deserialize(tc.value) as PowerScalar
      return new Tetracoordinate(tc as Tetracoordinate)
      
    case VectorType.CCoord:
      const cc = obj as SerialCartesianCoord
      return new CartesianCoordinate(
        await deserialize(cc.x) as PowerScalar, 
        await deserialize(cc.y) as PowerScalar
      )
    
    case EXPR_CALC_TYPE:
      const ec = obj as SerialExprCalc
      // convert file path to import path by making absolute
      const importUrl = pathToFileURL(path.resolve(ec.filePath))
      return await (
        import(importUrl.toString())
        .then(
          exprCalcModule => {
            if (!exprCalcModule?.default) {
              throw new Error(`import from expression calculator ${importUrl} returned ${exprCalcModule}`)
            }
            return new exprCalcModule.default(ec.filePath) as ExpressionCalculator
          },
          err => {
            throw new Error(`import from expression calculator ${importUrl} failed`, {cause: err})
          }
        )
      )

    default:
      throw new Error(`failed to serialize ${obj} type=${obj.type}`)
  }
}

export * from "./const"