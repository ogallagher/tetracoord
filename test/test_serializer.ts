import { describe } from "mocha"
import assert from "node:assert"
import { ScalarType } from "../src/tetracoord/scalar/const"
import { RadixType } from "../src/tetracoord/scalar/radix"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar/powerscalar"
import { IRR_SUFFIX_I, VAR_ANS_ID } from "../src/tetracoord/calculator/symbol"
import type { ExpressionPrimitiveValue, ExpressionValue } from "../src/tetracoord/calculator/expression/const"
import type { SerialCartesianCoord, SerialPowerScalar, SerialTetracoord, SerialVarCtx, Serializable } from "../src/tetracoord/serializer/const"
import { deserialize, serialize } from "../src/tetracoord/serializer"
import { CartesianCoordinate, Tetracoordinate, VectorType } from "../src/tetracoord/vector"
import { VariableContext } from "../src/tetracoord/calculator/variablecontext"
import { evalExpression } from "../src/tetracoord"
import { loadFile, saveFile } from "../src/cli/filesystem"

type TestCtx = Serializable & {
  var: SerialVarCtx
}

describe('serialize', () => {
  describe('memory', () => {
    it('serializes and deserializes scalar values', async () => {
      let _id: string, _val: ExpressionValue, _err: Error|undefined, sVal: SerialPowerScalar|ExpressionPrimitiveValue, dVal: PowerScalar|ExpressionPrimitiveValue
  
      for (let [id, val, err] of [
        ['number', 5.6],
        ['boolean', true],
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
          sVal = await serialize(_val) as SerialPowerScalar|ExpressionPrimitiveValue
          dVal = await deserialize(sVal) as PowerScalar|ExpressionPrimitiveValue
          assert.deepStrictEqual(dVal, _val, `${id}: mismatch original=${_val} serialized=${sVal} deserialized=${dVal}`)
        }
      }
    })
  
    it('serializes and deserializes vector values', async () => {
      let _id: string, _val: ExpressionValue, sVal: SerialCartesianCoord|SerialTetracoord, dVal: CartesianCoordinate|Tetracoordinate
  
      for (let [id, val] of [
        [`${VectorType.CCoord}.${RadixType.D}`, new CartesianCoordinate(-5.0, 15.5)],
        [`${VectorType.CCoord}.${RadixType.Q}`, new CartesianCoordinate(parsePowerScalar('321', RadixType.Q), parsePowerScalar('-12.3', RadixType.Q))],
        [`${VectorType.TCoord}.${IRR_SUFFIX_I}`, new Tetracoordinate('301', undefined, undefined, -5, true)]
      ]) {
        _id = id as string
        _val = val as ExpressionValue
  
        sVal = await serialize(_val) as SerialCartesianCoord|SerialTetracoord
        dVal = await deserialize(sVal) as CartesianCoordinate|Tetracoordinate
        assert.deepStrictEqual(dVal, _val, `${id}: mismatch original=${_val} serialized=${sVal} deserialized=${dVal}`)
      }
    })
  })

  describe('filesystem storage', () => {
    it('saves and loads variable context', async () => {
      const varCtx = new VariableContext()
      varCtx[VAR_ANS_ID] = new CartesianCoordinate(5, -1)
      varCtx.set('coefficient', await evalExpression('-0b0.1')) // -0.5
      
      await evalExpression('var.$ans * var.coefficient', varCtx) // var.$ans = (-0.25, 0.5)

      const filePath = 'test/out/test-serializer.data.json'
      saveFile(filePath, {type: 'test', var: varCtx.save()} as TestCtx)
      const testCtx = loadFile(filePath) as TestCtx

      const _varCtx = new VariableContext()
      await _varCtx.load(testCtx.var)
      assert.deepStrictEqual(varCtx, _varCtx)
    })
  })
})