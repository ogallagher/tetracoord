import { PowerScalar } from "../scalar"
import { ScalarType } from "../scalar/const"
import type { PowerScalarConstructorIn } from "../scalar/powerscalar"
import { Tetracoordinate } from "../vector/tetracoordinate"
import { VectorType } from "../vector/const"
import type { SerialCartesianCoord, SerialExprVal, Serializable, SerialPowerScalar, SerialTetracoord } from "./const"
import { CartesianCoordinate } from "../vector"
import { ExpressionValue } from "../calculator/const"

/**
 * @param val 
 * @returns An object whose properties can be passed directly to {@linkcode JSON.stringify}.
 */
export function serialize(val: SerialExprVal) {
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

    default:
      throw new Error(`failed to serialize `)
  }
}

export function deserialize(obj: Serializable): ExpressionValue {
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
      tc.value = deserialize(tc.value) as PowerScalar
      return new Tetracoordinate(tc as Tetracoordinate)
      
    case VectorType.CCoord:
      const cc = obj as SerialCartesianCoord
      return new CartesianCoordinate(
        deserialize(cc.x) as PowerScalar, 
        deserialize(cc.y) as PowerScalar
      )

    default:
      throw new Error(`failed to serialize ${obj} type=${obj.type}`)
  }
}