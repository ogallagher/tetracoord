/**
 * Expression parser that extends {@link https://npmjs.org/package/subscript subscript}.
 */

// enable subset of default subscript syntax
import "subscript/feature/number.js"
import "subscript/feature/string.js"

import "subscript/feature/call.js"
// TODO remove commented parser extensions if not needed
// parser handle expression calculator method call. a(b,c,d), a()
// access(CALL_OP, PREC_ACCESS)
// operator(
//   CALL_OP, 
//   (a: any, b: any, args: any) => b !== undefined && (
//     args = !b 
//     ? () => [] // a()
//     : b[0] === ',' ? (b = b.slice(1).map(b => !b ? err() : compile(b)), ctx => b.map(arg => arg(ctx))) : // a(b,c)
//         (b = compile(b), ctx => [b(ctx)]), // a(b)

//     // a(...args), a.b(...args), a[b](...args)
//     prop(a, (obj, path, ctx) => obj[path](...args(ctx)), true)
//   )
// )

import "subscript/feature/access.js"
// a[b]
// access(VAR_ACCESS_BRACKET_OP, PREC_ACCESS)
// operator(VAR_ACCESS_BRACKET_OP, (a: any, b: any) => !b ? err() : (a = compile(a), b = compile(b), ctx => a(ctx)[b(ctx)]))

// a.b
// binary(VAR_ACCESS_DOT_OP, PREC_ACCESS)
// operator(VAR_ACCESS_DOT_OP, (a: any, b: any) => (a = compile(a), b = !b[0] ? b[1] : b, ctx => a(ctx)[b])) // a.true, a.1 → needs to work fine

import "subscript/feature/group.js"

import "subscript/feature/assign.js"
// parser handle assign to variable context members
// binary(ASSIGN_OP, PREC_ASSIGN, true)
// operator(ASSIGN_OP, (a: any, b: any) => (
//   b = compile(b),
//   // a = x, ((a)) = x, a.b = x, a['b'] = x
//   prop(a, (container: any, path: any, ctx: any) => container[path] = b(ctx))
// ))

import "subscript/feature/mult.js"
import "subscript/feature/add.js"
import "subscript/feature/increment.js"
// import "subscript/feature/bitwise.js"
import "subscript/feature/logic.js"
import "subscript/feature/compare.js"
// import "subscript/feature/shift.js"
import compile from "subscript/src/compile.js"
// export subset
export { parse, access, binary, unary, nary, group, token } from "subscript/src/parse.js"
export { compile, operator } from "subscript/src/compile.js"
export { stringify } from "subscript/src/stringify.js"

// add new syntax
import { nary, unary, binary, group, err, token, access } from "subscript/src/parse.js";
import { operator, prop } from "subscript/src/compile.js"
import { PREC_ACCESS, PREC_GROUP, PREC_TOKEN, PREC_EQ, PREC_ASSIGN } from "subscript/src/const.js";
import { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from "../vector/cartesian";
import { RADIX_PREFIX_OP, IRR_SUFFIX_OP, ABS_GROUP_OP, COSPI6_CONST, SINPI6_CONST, EQ_STRICT_OP, NEQ_STRICT_OP, ASSIGN_OP, CALL_OP, VEC_ACCESS_OP, VAR_ACCESS_DOT_OP, VAR_ACCESS_BRACKET_OP } from "./symbol";

// parser handle exponent from justin
import "subscript/feature/pow.js"
// parser handle true,false keywords from justin
import "subscript/feature/bool.js"

// parser handle literal number radix prefix as <radix> @ <raw-fractional-value>
nary(RADIX_PREFIX_OP, PREC_ACCESS)

// parser handle literal number irrational suffix as <raw-fractional-value> ~
unary(IRR_SUFFIX_OP, PREC_ACCESS + 1, true)

// parser handle absolute value, magnitude
group(ABS_GROUP_OP, PREC_GROUP)
operator(ABS_GROUP_OP, (a: any, b: any) => b === undefined && (!a && err(`Empty ${ABS_GROUP_OP}`), compile(a)))

// parser handle strict type comparison (copied from justin)
binary(EQ_STRICT_OP, PREC_EQ)
binary(NEQ_STRICT_OP, 9)
operator(EQ_STRICT_OP, (a: any, b: any) => (a = compile(a), b = compile(b), (ctx: any) => a(ctx) === b(ctx)))
operator(NEQ_STRICT_OP, (a: any, b: any) => (a = compile(a), b = compile(b), (ctx: any) => a(ctx) !== b(ctx)))

// parser handle trig constant
token(COSPI6_CONST, PREC_TOKEN, a => a ? err() : [, TRIG_COS_PI_OVER_6])
token(SINPI6_CONST, PREC_TOKEN, a => a ? err() : [, TRIG_SIN_PI_OVER_6])
