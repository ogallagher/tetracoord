import { describe } from "mocha"
import assert from "node:assert"
import { ScalarType } from "../src/tetracoord/scalar/const"
import { RadixType } from "../src/tetracoord/scalar/radix"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar/powerscalar"
import { IRR_SUFFIX_I } from "../src/tetracoord/calculator/symbol"
import type { ExpressionPrimitiveValue, ExpressionValue } from "../src/tetracoord/calculator/const"
import type { SerialCartesianCoord, SerialExprVal, SerialPowerScalar, SerialTetracoord } from "../src/tetracoord/serializer/const"
import { deserialize, serialize } from "../src/tetracoord/serializer"
import { CartesianCoordinate, Tetracoordinate, VectorType } from "../src/tetracoord"

describe('serialize', () => {
  it('serializes and deserializes scalar values', () => {
    let _id: string, _val: ExpressionValue, _err: Error|undefined, sVal: SerialPowerScalar|ExpressionPrimitiveValue, dVal: PowerScalar|ExpressionPrimitiveValue

    for (let [id, val, err] of [
      ['number', 5.6],
      ['boolean', true],
      ['null', null, new Error('not a valid expression value')],
      ['string', '', new Error('not a valid expression value')],
      [`${ScalarType.PowerScalar}.${RadixType.D}`, parsePowerScalar(-7.5, RadixType.D)],
      [`${ScalarType.PowerScalar}.${RadixType.B}`, parsePowerScalar('11', RadixType.B)],
      [`${ScalarType.PowerScalar}.${RadixType.Q}.${IRR_SUFFIX_I}`, parsePowerScalar('-3.1', RadixType.Q, true)]
    ]) {
      _id = id as string
      _val = val as ExpressionValue
      _err = err as Error|undefined

      if (_err !== undefined) {
        assert.throws(() => serialize(_val), _err.message)
      }
      else {
        sVal = serialize(_val) as SerialPowerScalar|ExpressionPrimitiveValue
        dVal = deserialize(sVal) as PowerScalar|ExpressionPrimitiveValue
        assert.deepStrictEqual(dVal, _val, `${id}: mismatch original=${_val} serialized=${sVal} deserialized=${dVal}`)
      }
    }
  })

  it('serializes and deserializes vector values', () => {
    let _id: string, _val: ExpressionValue, sVal: SerialCartesianCoord|SerialTetracoord, dVal: CartesianCoordinate|Tetracoordinate

    for (let [id, val] of [
      [`${VectorType.CCoord}.${RadixType.D}`, new CartesianCoordinate(-5.0, 15.5)],
      [`${VectorType.CCoord}.${RadixType.Q}`, new CartesianCoordinate(parsePowerScalar('321', RadixType.Q), parsePowerScalar('-12.3', RadixType.Q))],
      [`${VectorType.TCoord}.${IRR_SUFFIX_I}`, new Tetracoordinate('301', undefined, undefined, -5, true)]
    ]) {
      _id = id as string
      _val = val as ExpressionValue

      sVal = serialize(_val) as SerialCartesianCoord|SerialTetracoord
      dVal = deserialize(sVal) as CartesianCoordinate|Tetracoordinate
      assert.deepStrictEqual(dVal, _val, `${id}: mismatch original=${_val} serialized=${sVal} deserialized=${dVal}`)
    }
  })
})