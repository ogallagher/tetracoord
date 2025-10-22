import { describe, it } from "mocha"
import assert from "node:assert"
import { VariableContext } from "../src/tetracoord/calculator/variablecontext"
import { VAR_ANS_ID } from "../src/tetracoord/calculator/symbol"
import { evalExpression } from "../src/tetracoord/calculator/expression"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar/powerscalar"
import { RadixType } from "../src/tetracoord/scalar/radix"
import { CartesianCoordinate } from "../src/tetracoord"

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

  it('fails if context not defined', () => {
    assert.throws(() => evalExpression('var.a = 1'))
  })

  it('fails if illegal access', () => {
    assert.throws(() => evalExpression('var.$ans = 1'))
  })

  it('assigns to existing and new var members', () => {
    let res = evalExpression(
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

    evalExpression('var[six0d] = 6', varCtx)
    assert.strictEqual(varCtx.get('six0d'), 6, 'var[six0d]')
    evalExpression('var["seven0d is a decimal raw scalar"] = 7.0', varCtx)
    assert.strictEqual(varCtx.get('seven0d is a decimal raw scalar'), 7, 'var["seven0d is a decimal raw scalar"]')
  })

  it(`references var members including ${VAR_ANS_ID}`, () => {
    evalExpression('var.pt1 = cc[3, 3 + var.one0b]', varCtx)

    evalExpression('var.pt2 = var.$ans * 2', varCtx)

    const pt1 = varCtx.get('pt1') as CartesianCoordinate
    const pt2 = varCtx.get('pt2') as CartesianCoordinate
    assert(pt1 instanceof CartesianCoordinate, 'var.pt1 should be ccoord')
    assert(pt2.magnitude === pt1.magnitude * 2, '|var.pt2| should be double |var.pt1|')
  })
})