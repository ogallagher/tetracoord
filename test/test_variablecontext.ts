import { describe, it } from "mocha"
import assert from "node:assert"
import { VariableContext } from "../src/tetracoord/calculator/variablecontext"
import { VAR_ANS_ID } from "../src/tetracoord/calculator/symbol"
import { evalExpression } from "../src/tetracoord/calculator/expression"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar/powerscalar"
import { RadixType } from "../src/tetracoord/scalar/radix"
import { CartesianCoordinate, Tetracoordinate } from "../src/tetracoord"
import type { Serializable, SerialVarCtx } from "../src/tetracoord/serializer/const"
import { loadFile, saveFile } from "../src/cli/filesystem"
import { ExpressionCalculator } from "../src/tetracoord/calculator/expression/expressioncalculator"
import VectorAverageMagnitude from "./res/exprcalc_vectoravg"

type TestCtx = Serializable & {
  var: SerialVarCtx
}

describe('variable context', () => {
  const varCtx = new VariableContext()
  const one0b = parsePowerScalar('1', RadixType.B)
  const oneIb = parsePowerScalar('1', RadixType.B, true)

  beforeEach(() => {
    varCtx.$ans = undefined
    varCtx.values = {
      one0b: one0b
    }
  })

  describe('standard variable members', () => {
    it('fails if context not defined', () => {
      assert.rejects(async () => await evalExpression('var.a = 1'))
    })

    it('fails if illegal access', () => {
      assert.rejects(async () => await evalExpression('var.$ans = 1'))
    })

    it('assigns to existing and new var members', async () => {
      let res = await evalExpression(
        'var.five0q = 0q3 + (var.one0b = 0b1.1i)', 
        varCtx
      )

      assert.notStrictEqual(res, one0b, 'res vs old val')
      assert.strictEqual((varCtx.values.one0b as PowerScalar).toNumber(), (oneIb as PowerScalar).toNumber(), `updated vs expected var=${JSON.stringify(varCtx, undefined, 2)}`)
      
      assert.strictEqual(
        (varCtx.values.five0q as PowerScalar).toNumber(), 
        parsePowerScalar('11', RadixType.Q).toNumber(),
        'var.five0q = 3 + var.one0b(+1)'
      )

      assert.strictEqual(
        (varCtx[VAR_ANS_ID] as PowerScalar).toNumber(),
        (varCtx.get('five0q') as PowerScalar).toNumber(),
        `var.$ans = var.five0q`
      )

      assert.strictEqual((varCtx[VAR_ANS_ID] as PowerScalar).toNumber(), (res as PowerScalar).toNumber(), 'var.$ans vs ans')

      await evalExpression('var[six0d] = 6', varCtx)
      assert.strictEqual(varCtx.get('six0d'), 6, 'var[six0d]')
      await evalExpression('var["seven0d is a decimal raw scalar"] = 7.0', varCtx)
      assert.strictEqual(varCtx.get('seven0d is a decimal raw scalar'), 7, 'var["seven0d is a decimal raw scalar"]')
    })

    it(`references var members including ${VAR_ANS_ID}`, async () => {
      await evalExpression('var.pt1 = cc[3, 3 + var.one0b]', varCtx)

      await evalExpression('var.pt2 = var.$ans * 2', varCtx)

      const pt1 = varCtx.get('pt1') as CartesianCoordinate
      const pt2 = varCtx.get('pt2') as CartesianCoordinate
      assert(pt1 instanceof CartesianCoordinate, 'var.pt1 should be ccoord')
      assert(pt2.magnitude === pt1.magnitude * 2, '|var.pt2| should be double |var.pt1|')
    })
  })

  describe('ExpressionCalculator members, calculator extensions', () => {
    it('fails if calc extension file is missing or exports wrong type', () => {
      for (let inFilePath of [
        'test/res/test-vectoravg_missing.json',
        'test/res/test-vectoravg_mistyped.json'
      ]) {
        assert.rejects(async () => {
          const testCtx = loadFile(inFilePath) as TestCtx
          await varCtx.load(testCtx.var)
        })
      }
    })

    it('loads calc extension from file', async () => {
      const testCtx = loadFile('test/res/test-vectoravg.json') as TestCtx
      await varCtx.load(testCtx.var)

      const vectorAvgMag = varCtx.get('vectorAvgMag')
      assert(
        vectorAvgMag instanceof ExpressionCalculator && vectorAvgMag instanceof VectorAverageMagnitude,
        `unexpected type of var.vectorAvgMag=${vectorAvgMag}`
      )

      const vectors = [
        new Tetracoordinate('10'),  // mag=0d2
        new Tetracoordinate('3'),   // mag=0d1
        new Tetracoordinate('2')    // mag=0d1
      ]
      assert.strictEqual(
        Math.round((vectorAvgMag as ExpressionCalculator).eval({items: vectors}) as number * 1e7) / 1e7,
        Math.round(4/3 * 1e7) / 1e7,
        `mismatch of average vector magnitude expression calculator`
      )
    })

    it('loads calc extension within var.method assignment expression and saves calc extension to file', async () => {
      // load in expression
      const vectorAvgMag = await evalExpression('var.vectorAvgMag = exprcalc["test/res/exprcalc_vectoravg.ts"]', varCtx)
      assert(
        vectorAvgMag instanceof ExpressionCalculator 
        && vectorAvgMag instanceof VectorAverageMagnitude, 
        `res did not import the right type of ${vectorAvgMag}`
      )
      assert(
        varCtx.get('vectorAvgMag') instanceof ExpressionCalculator 
        && varCtx.get('vectorAvgMag') instanceof VectorAverageMagnitude, 
        `var.vectorAvgMag did not import the right type of ${varCtx.get("vectorAvgMax")}`
      )

      // save to file
      const filePath = 'test/out/test-variablecontext-exprcalc.data.json'
      saveFile(filePath, {type: 'test', var: varCtx.save()} as TestCtx)

      // load from same file
      const testCtx = loadFile(filePath) as TestCtx
      const _varCtx = new VariableContext()
      await _varCtx.load(testCtx.var)
      assert.deepEqual(varCtx, _varCtx)

      const avgMag = (_varCtx.get('vectorAvgMag') as VectorAverageMagnitude).eval({
        items: [
          new Tetracoordinate('10'),  // mag=0d2
          new Tetracoordinate('3'),   // mag=0d1
          new Tetracoordinate('2')    // mag=0d1
        ]
      })
      assert.strictEqual(
        Math.round(avgMag as number * 1e7) / 1e7,
        Math.round(4/3 * 1e7) / 1e7,
        `mismatch of average vector magnitude expression calculator after load->save->load`
      )
    })
  })
})