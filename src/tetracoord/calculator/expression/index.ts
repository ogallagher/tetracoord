import pino from "pino"
import { parse } from "../parser"
import { RadixType, PowerScalar, parsePowerScalar } from "../../scalar"
import { Tetracoordinate, CartesianCoordinate, VectorType } from "../../vector"
import { type ExpressionValue, type ExpressionTree, type ExpressionLeaf, type ExpressionInnerValue, ExpressionValueCollection } from "./const"
import { RADIX_PREFIX, IRR_SUFFIX_I, IRR_SUFFIX_DOTS, IRR_SUFFIX_OP, RADIX_PREFIX_OP, NEG_OP, MUL_OP, EQ_LOOSE_OP, VAR_ACCESS_DOT_OP, VAR_ACCESS_BRACKET_OP, VAR_CTX_ID, POS_OP, ABS_GROUP_OP, DIV_OP, EXP_OP, ITEM_DELIM_OP, VEC_ACCESS_OP, EQ_STRICT_OP, NEQ_STRICT_OP, GROUP_OP, ASSIGN_OP, VAR_ANS_ID, EXPR_CALC_ACCESS_OP, CALL_OP, TCOORD_V, CCOORD_X, CCOORD_Y } from "../symbol"
import { VariableContext } from "../variablecontext"
import { EXPR_CALC_TYPE, ExpressionCalculator } from "./expressioncalculator"
import { deserialize, SerialExprCalc } from "../../serializer"

export * from "./const"
export * from "./expressioncalculator"

export const logger = pino({
  name: 'calculator.expression',
  level: 'warn'
})

/**
 * Translate true tetracoord calculator expression to intermediate syntax for parser compatibility.
 *
 * This step would not be necessary with more exact parser customization.
 *
 * @param str
 * @returns
 */
export function preparseExpression(str: string): string {
  const pattern = new RegExp(
    [
      // radix prefix
      `(?<!\\w)${RADIX_PREFIX}([${RadixType.B}${RadixType.Q}${RadixType.D}])(?=[\\d\\.])`,
      // irrational suffix
      `(\\d)${IRR_SUFFIX_I}`,
      `(\\d)\\.\\.\\.`
    ].map(p => `(${p})`).join('|'),
    'g'
  )

  let matcher: RegExpExecArray | null
  let match: string[]
  let matchStr: string
  let strParts = []
  let cursor = 0
  while ((matcher = pattern.exec(str)) !== null) {
    strParts.push(str.substring(cursor, matcher.index))

    match = matcher.filter((v) => v !== undefined)
    matchStr = match[0]
    if (matchStr.endsWith(IRR_SUFFIX_I) || matchStr.endsWith(IRR_SUFFIX_DOTS)) {
      const digit = match[2]
      if (digit === '0') {
        // not actually irrational; remove suffix in preparser
        strParts.push(digit)
      }
      else {
        strParts.push(`${digit}${IRR_SUFFIX_OP}`)
      }
    }
    else if (matchStr.startsWith(RADIX_PREFIX)) {
      const radix = match[2]
      strParts.push(`${radix}${RADIX_PREFIX_OP}`)
    }
    else {
      throw new SyntaxError(`cannot preparse invalid match=${matchStr} for pattern=${pattern}`)
    }

    cursor = pattern.lastIndex
  }
  strParts.push(str.substring(cursor))

  return strParts.join('')
}

function parseSemiscalarOperands(a: ExpressionValue, b: ExpressionValue, commutative: boolean = true) {
  let semiscalar: boolean
  if (a instanceof Tetracoordinate || a instanceof CartesianCoordinate) {
    semiscalar = true
  }
  if (!semiscalar && b instanceof Tetracoordinate || b instanceof CartesianCoordinate) {
    semiscalar = true
    if (!commutative) {
      // operator is not commutative
      throw new TypeError(`operands must be vector left=${a}, scalar right=${b}`)
    }
    // swap operands for vector as left
    const _a = a; a = b; b = _a
  }

  return { semiscalar, a, b }
}

function parseScalarNode(node: ExpressionTree, radixType: RadixType): PowerScalar {
  const op = node[0]
  const a = node[1]

  if (op === undefined) {
    // [ a=<rational-value>]
    return parsePowerScalar(a as number, radixType)
  }
  else if (op === IRR_SUFFIX_OP) {
    // [~ a=[ <value>]]
    return parsePowerScalar(a[1] as number, radixType, true)
  }
  else {
    throw new SyntaxError(`invalid scalar number node=${node}`)
  }
}

/**
 * Parse a value as a string which subscript parser would recognize as a string (quoted) or an identifier (unquoted).
 */
const parseString = (node: string|[undefined, string]) => (
  typeof node !== 'string'
  // quoted string literal
  ? (node as ExpressionTree)[1] as string
  // unquoted identifier treated as string
  : node
)

/**
 * Return the negative of a value.
 * 
 * There's not much reason for this to implement the `ExpressionCalculator` interface; I mostly do so as an easy example.
 */
function evalNegate(a: ExpressionValue): ExpressionValue {
  if (typeof a === 'number') {
    return -a
  }
  else if (a instanceof PowerScalar) {
    return a.negate()
  }
  else if (a instanceof Tetracoordinate) {
    return a.negateFromCartesian()
  }
  else if (a instanceof CartesianCoordinate) {
    return a.negate()
  }
}

function evalAbs(a: ExpressionValue): ExpressionValue {
  if (typeof a === 'number') {
    return Math.abs(a)
  }
  else if (a instanceof PowerScalar) {
    return PowerScalar.abs(a)
  }
  else if (a instanceof Tetracoordinate) {
    return a.magnitudeFromCartesian
  }
  else if (a instanceof CartesianCoordinate) {
    return a.magnitude
  }
}

function evalAddSub(op: '-' | '+', a: ExpressionValue, b: ExpressionValue): ExpressionValue {
  if (typeof a === 'number' && typeof b === 'number') {
    // simple scalar
    return op === NEG_OP ? a - b : a + b
  }
  else {
    if (a instanceof PowerScalar || b instanceof PowerScalar) {
      // power scalar
      return (
        op === NEG_OP
          ? PowerScalar.subtract(a as number | PowerScalar, b as number | PowerScalar)
          : PowerScalar.add(a as number | PowerScalar, b as number | PowerScalar)
      )
    }
    else if (a instanceof Tetracoordinate && b instanceof Tetracoordinate) {
      // tcoord vector
      return (
        op === NEG_OP
          ? a.clone().subtractFromCartesian(b)
          : a.clone().addFromCartesian(b)
      )
    }
    else if (a instanceof CartesianCoordinate && b instanceof CartesianCoordinate) {
      // ccoord vector
      return (
        op === NEG_OP
          ? CartesianCoordinate.subtract(a, b)
          : CartesianCoordinate.add(a, b)
      )
    }
    else {
      // mixed vector
      throw new TypeError(`vector binary add/subtract not supported for mixed types; convert first. a=${a} b=${b}`)
    }
  }
}

function evalMulDiv(op: '*' | '/', a: ExpressionValue, b: ExpressionValue): ExpressionValue {
  if (typeof a === 'number' && typeof b === 'number') {
    // simple scalar
    return op === MUL_OP ? a * b : a / b
  }
  else {
    let { semiscalar, a: _a, b: _b } = parseSemiscalarOperands(a, b, op === '*')

    if (semiscalar) {
      if (_a instanceof Tetracoordinate) {
        return (
          op === MUL_OP
            ? _a.clone().multiplyFromCartesian(_b as number | PowerScalar)
            : _a.clone().divideFromCartesian(_b as number | PowerScalar)
        )
      }
      else {
        return (
          op === MUL_OP
            ? CartesianCoordinate.multiply(_a as CartesianCoordinate, _b as number | PowerScalar)
            : CartesianCoordinate.divide(_a as CartesianCoordinate, _b as number | PowerScalar)
        )
      }
    }
    else if (_a instanceof PowerScalar || _b instanceof PowerScalar) {
      // power scalar
      return (
        op === MUL_OP
          ? PowerScalar.multiply(_a as number | PowerScalar, _b as number | PowerScalar)
          : PowerScalar.divide(_a as number | PowerScalar, _b as number | PowerScalar)
      )
    }
    else {
      // unknown, probably vector
      throw new TypeError(`binary multiply/divide not supported for given types a=${a} b=${b}`)
    }
  }
}

function evalPow(a: ExpressionValue, b: ExpressionValue): ExpressionValue {
  if (typeof a === 'number' && typeof b === 'number') {
    // simple scalar
    return a ** b
  }
  else {
    let { semiscalar, a: _a, b: _b } = parseSemiscalarOperands(a, b, false)

    if (semiscalar) {
      if (_a instanceof Tetracoordinate) {
        return _a.clone().powFromCartesian(_b as number | PowerScalar)
      }
      else {
        return CartesianCoordinate.pow(_a as CartesianCoordinate, _b as number | PowerScalar)
      }
    }
    else if (_a instanceof PowerScalar || _b instanceof PowerScalar) {
      return PowerScalar.pow(_a as number | PowerScalar, _b as number | PowerScalar)
    }
  }
}

function evalEq(op: '===' | '==', a: ExpressionValue, b: ExpressionValue): boolean {
  if (op === EQ_LOOSE_OP) {
    throw new SyntaxError(`loose equality ${op} for implicit type conversion is not supported`)
  }

  if (typeof a === 'number' && typeof b === 'number') {
    // simple scalar
    return a === b
  }
  else {
    if (a instanceof PowerScalar && b instanceof PowerScalar) {
      // power scalar
      return a.equals(b)
    }
    else if (a instanceof Tetracoordinate && b instanceof Tetracoordinate) {
      // tcoord vector
      return a.equals(b)
    }
    else if (a instanceof CartesianCoordinate && b instanceof CartesianCoordinate) {
      // ccoord vector
      return a.equals(b)
    }
    else {
      // mixed types
      throw new TypeError(`strict equality ${op} not supported for mixed types; convert first. a=${a} b=${b}`)
    }
  }
}

/**
 * 
 * @param acc 
 * @param varCtxId 
 * @param varCtxKey 
 * @returns `VariableContext` instance member key.
 */
function assertVarAccess(acc: ExpressionTree | ExpressionLeaf, varCtxId: ExpressionTree | ExpressionLeaf, varCtxKey: ExpressionTree | ExpressionLeaf) {
  if (acc === VAR_ACCESS_DOT_OP || acc === VAR_ACCESS_BRACKET_OP) {
    // confirm variable belongs to VariableContext
    if (varCtxId !== VAR_CTX_ID) {
      throw new SyntaxError(
        `all variables must belong to variable context ${VAR_CTX_ID}`,
        { cause: `${varCtxId}${VAR_ACCESS_DOT_OP}<member>` }
      )
    }

    // evaluate literal string key like var["key"] same as var[key]
    return parseString(varCtxKey as string|[undefined, string])
  }
  else {
    throw new SyntaxError(`cannot access parent=${varCtxId} access-op=${acc} member=${varCtxKey} that doesn't belong to ${VAR_CTX_ID}`)
  }
}

/**
 * Assign b=value to a=var.member and return value.
 */
async function evalAssignNode(a: ExpressionTree, b: ExpressionTree | ExpressionValue, varCtx: VariableContext) {
  // evaluate left variable reference
  const [acc, varCtxId, varCtxKey] = a
  const _varCtxKey = assertVarAccess(acc, varCtxId, varCtxKey)

  // evaluate right value
  let _b = (Array.isArray(b) ? await parseExpressionTree(b, undefined, varCtx) : b) as ExpressionValue

  // perform assignment
  varCtx.set(_varCtxKey, _b)

  // return right value as result
  return _b
}

async function loadExprCalc(filePath: string): Promise<ExpressionCalculator> {
  return await deserialize(
    {
      type: EXPR_CALC_TYPE,
      filePath: filePath
    } as SerialExprCalc
  ) as ExpressionCalculator
}

/**
 * Both parses and evaluates the expression abstract syntax tree from the given root node.
 */
async function parseExpressionTree(node: ExpressionTree, radixCtx: RadixType = RadixType.D, varCtx?: VariableContext): Promise<ExpressionInnerValue> {
  const op = node[0]
  const a = node[1]
  const b = node[2]

  if (op === RADIX_PREFIX_OP) {
    // convert [@ a=<radix-type> b=<scalar-node>] to PowerScalar
    const r = a as RadixType
    return parseScalarNode(b as ExpressionTree, r)
  }
  else if (op === IRR_SUFFIX_OP) {
    // convert implied radix [~ a=<scalar-node>] to PowerScalar
    return parseScalarNode(node, radixCtx)
  }
  else if (op === NEG_OP || op === POS_OP) {
    const _a = await parseExpressionTree(a as ExpressionTree, radixCtx, varCtx)

    if (b === undefined) {
      // unary
      if (op === NEG_OP) {
        // negate 
        return evalNegate(_a as ExpressionValue)
      }
      else {
        // positive (identity)
        return _a
      }
    }
    else {
      // binary
      const _b = await parseExpressionTree(b as ExpressionTree, radixCtx, varCtx)
      return evalAddSub(op, _a as ExpressionValue, _b as ExpressionValue)
    }
  }
  else if (op === ABS_GROUP_OP && b === undefined) {
    return evalAbs(await parseExpressionTree(a as ExpressionTree, radixCtx, varCtx) as ExpressionValue)
  }
  else if (op === MUL_OP || op === DIV_OP) {
    return evalMulDiv(
      op,
      await parseExpressionTree(a as ExpressionTree, radixCtx, varCtx) as ExpressionValue,
      await parseExpressionTree(b as ExpressionTree, radixCtx, varCtx) as ExpressionValue
    )
  }
  else if (op === EXP_OP) {
    return evalPow(
      await parseExpressionTree(a as ExpressionTree, radixCtx, varCtx) as ExpressionValue,
      await parseExpressionTree(b as ExpressionTree, radixCtx, varCtx) as ExpressionValue
    )
  }
  else if (op === ITEM_DELIM_OP) {
    // return collection of values
    return new ExpressionValueCollection(await Promise.all(
      node.slice(1).map(async i => await parseExpressionTree(i as ExpressionTree, radixCtx, varCtx) as ExpressionValue)
    ))
  }
  else if (op === VEC_ACCESS_OP && (a === VectorType.CCoord || a === VectorType.TCoord)) {
    const _b = await parseExpressionTree(b as ExpressionTree, a === VectorType.CCoord ? RadixType.D : RadixType.Q, varCtx)

    if (_b instanceof CartesianCoordinate || _b instanceof Tetracoordinate) {
      // vector type conversion
      if ((a === VectorType.CCoord && _b instanceof CartesianCoordinate) || (a === VectorType.TCoord && _b instanceof Tetracoordinate)) {
        // identity
        return _b
      }
      else if (a === VectorType.CCoord) {
        // tcoord --> ccoord
        return (_b as Tetracoordinate).toCartesianCoord()
      }
      else {
        // ccoord --> tcoord
        return Tetracoordinate.fromCartesianCoord(_b as CartesianCoordinate)
      }
    }
    else if (a === VectorType.CCoord) {
      // convert ['[]' a='cc' b=[',' <x> <y>]] to CartesianCoordinate
      try {
        const [_x, _y] = (_b as ExpressionValueCollection).items
        return new CartesianCoordinate(_x as number, _y as number)
      }
      catch (err) {
        throw new SyntaxError(`failed to parse ${b}-->${_b} as ccoord x,y components`, { cause: err })
      }
    }
    else {
      // convert ['[]' a='tc' b=[ <scalar-node>]] to Tetracoordinate
      try {
        return new Tetracoordinate(_b as number | PowerScalar)
      }
      catch (err) {
        throw new SyntaxError(`failed to parse ${b}-->${_b} as tccord scalar value`, { cause: err })
      }
    }
  }
  else if (op === EQ_STRICT_OP || op === NEQ_STRICT_OP && b !== undefined) {
    const eq = evalEq(
      EQ_STRICT_OP,
      await parseExpressionTree(a as ExpressionTree, radixCtx, varCtx) as ExpressionValue,
      await parseExpressionTree(b as ExpressionTree, radixCtx, varCtx) as ExpressionValue
    )
    return (op === EQ_STRICT_OP) ? eq : !eq
  }
  else if (op === GROUP_OP && b === undefined) {
    return parseExpressionTree(a as ExpressionTree, radixCtx, varCtx)
  }
  else if (op === CALL_OP && b !== undefined) {
    // [() <method> <args>] or [() <method> null]
    // left method reference
    const exprCalc = await parseExpressionTree(a as ExpressionTree, radixCtx, varCtx) as ExpressionCalculator
    if (!(exprCalc instanceof ExpressionCalculator)) {
      throw new SyntaxError(`invalid call of identifier=${exprCalc} that is not instance of ExpressionCalculator`)
    }
    // right arguments
    const args = (
      b === null
      // no args
      ? b
      // b must be tree because non literal identifiers always belong to var, requiring access, and literal primitives are lists with undefined first item 
      : await parseExpressionTree(b as ExpressionTree, radixCtx, varCtx)
    )

    // perform call
    return exprCalc.eval(
      (
        args === null
        // no args
        ? undefined
        // value collection
        : (
          args instanceof ExpressionValueCollection
          ? args
          : new ExpressionValueCollection([args as ExpressionValue])
        )
      ),
      varCtx
    )
  }
  else if (op === ASSIGN_OP && b !== undefined) {
    // assignment var.<member> = <value> (or var[member] = <value>)
    if (varCtx === undefined) {
      throw new Error(`cannot evaluate assignment ${node} without variable context`)
    }
    return evalAssignNode(a as ExpressionTree, b as ExpressionTree | ExpressionValue, varCtx)
  }
  else if (op === EXPR_CALC_ACCESS_OP && (a === EXPR_CALC_TYPE)) {
    // convert exprcalc[<file-path>] to ExpressionCalculator
    return await loadExprCalc(
      // evaluate literal string key like exprcalc["<file-path>"] same as exprcalc[<file-path>]
      typeof b !== 'string' ? (b as ExpressionTree)[1] as string : b
    )
  }
  else if (op === VAR_ACCESS_DOT_OP || op === VAR_ACCESS_BRACKET_OP) {
    // vector component access or context variable access
    if (Array.isArray(a)) {
      try {
        const vector = await parseExpressionTree(a, radixCtx, varCtx) as Tetracoordinate|CartesianCoordinate
        const cmp = parseString(b as string|[undefined, string])
        if (vector instanceof Tetracoordinate) {
          if (cmp !== TCOORD_V) {
            throw new Error(`tcoord component=${cmp} must be ${TCOORD_V}`)
          }
          return vector.value
        }
        else if (vector instanceof CartesianCoordinate) {
          if (cmp !== CCOORD_X && cmp !== CCOORD_Y) {
            throw new Error(`ccoord component=${cmp} must be ${CCOORD_X} or ${CCOORD_Y}`)
          }
          return vector.v[cmp]
        }
        else {
          throw new Error(`cannot access member/component=${cmp} of non vector parent=${vector}`)
        }
      }
      catch (err) {
        throw new Error(`cannot evaluate vector=${a} component=${b} access`, {cause: err})
      }
    }
    else {
      // evaluate context variable reference
      const varCtxKey = assertVarAccess(op, a, b)
      if (varCtx === undefined) {
        throw new Error(`cannot evaluate reference ${node} without variable context`)
      }

      return varCtx.get(varCtxKey)
    }
  }
  else if (op !== undefined) {
    // operator expression
    const isLeaf = (n: ExpressionLeaf | ExpressionTree) => !Array.isArray(n) || n[0] === undefined

    const _a = isLeaf(a) ? a : parseExpressionTree(a as ExpressionTree, radixCtx, varCtx)

    if (b === undefined) {
      // unary operation
      throw new SyntaxError(`unsupported unary operation ${[op, _a]}`)
    }
    else {
      // binary operation
      const _b = isLeaf(b) ? b : parseExpressionTree(b as ExpressionTree, radixCtx, varCtx)

      throw new SyntaxError(`unsupported binary operation ${[op, _a, _b]}`)
    }
  }
  else if (typeof a === 'number') {
    // number literal
    if (radixCtx === RadixType.D) {
      return a
    }
    else {
      return parsePowerScalar(a, radixCtx)
    }
  }
  else if (typeof a === 'boolean') {
    // boolean literal
    return a
  }
  else {
    throw new TypeError(`invalid literal type ${typeof a} of a=${a}`)
  }
}

/**
 * Evaluates expression, reads and writes the given variable context, and returns the result.
 */

export async function evalExpression(expr: string, varCtx?: VariableContext): Promise<ExpressionValue> {
  logger.info(`parse raw expression=${expr}`)

  expr = preparseExpression(expr)
  logger.debug(`preparsed expression=${expr}`)

  const res = await parseExpressionTree(parse(expr), undefined, varCtx) as ExpressionValue
  logger.debug(`result=${res}`)
  if (varCtx) {
    varCtx[VAR_ANS_ID] = res
  }

  return res
}
