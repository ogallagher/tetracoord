import type { RadixType } from "../scalar/radix"
import type { VectorType } from "../vector/const"
import type { VariableContext } from "./variablecontext"

/**
 * Prefix to the {@linkcode RadixType radix label} in a scalar literal.
 */
export const RADIX_PREFIX = '0'
/**
 * Operator corresponding to {@linkcode RADIX_PREFIX} in intermediate/parser syntax.
 */
export const RADIX_PREFIX_OP = '@'
/**
 * Default irrational suffix in a scalar literal.
 */
export const IRR_SUFFIX_I = 'i'
/**
 * Alternative irrational suffix in a scalar literal.
 */
export const IRR_SUFFIX_DOTS = '...'
/**
 * Operator corresponding to {@linkcode IRR_SUFFIX_I} in intermediate syntax.
 */
export const IRR_SUFFIX_OP = '~'
/**
 * Delimiter between the whole/integer digits and fractional digits (decimal point) in a scalar literal.
 */
export const WHOL_FRAC_DELIM = '.'
export const VAR_ACCESS_DOT_OP = WHOL_FRAC_DELIM
/**
 * Vector access operator, following the {@linkcode VectorType} label.
 */
export const VEC_ACCESS_OP = '[]'
export const VAR_ACCESS_BRACKET_OP = VEC_ACCESS_OP
export const EXPR_CALC_ACCESS_OP = VEC_ACCESS_OP
/**
 * Delimiter for items in a collection (ex. components in a cartesian coordinate).
 */
export const ITEM_DELIM_OP = ','
/**
 * Negative/subtract operator.
 */
export const NEG_OP = '-'
/**
 * Positive/add operator.
 */
export const POS_OP = '+'
/**
 * Multiply operator.
 */
export const MUL_OP = '*'
/**
 * Divide operator.
 */
export const DIV_OP = '/'
/**
 * Exponent operator.
 */
export const EXP_OP = '**'
/**
 * Scalar absolute value and vector magnitude group operator.
 */
export const ABS_GROUP_OP = '||'
/**
 * Parenthesis group operator.
 */
export const GROUP_OP = '()'
/**
 * Method call operator.
 */
export const CALL_OP = GROUP_OP
/**
 * Strict (same type) equal operator.
 */
export const EQ_STRICT_OP = '==='
/**
 * Strict (same type) not equal operator.
 */
export const NEQ_STRICT_OP = '!=='
export const EQ_LOOSE_OP = '=='
export const NEQ_LOOSE_OP = '!='
/**
 * Assignment operator.
 */
export const ASSIGN_OP = '='

export const STR_DQUOTE = '"'
export const STR_QUOTE = "'"

export const COSPI6_CONST = 'cospi6'
export const SINPI6_CONST = 'sinpi6'

export type VarCtxId = 'var'
/**
 * Identifier for single {@linkcode VariableContext} instance within expression calculator.
 */
export const VAR_CTX_ID: VarCtxId = 'var'
/**
 * Member of {@linkcode VAR_CTX_ID var} that always stores latest expression evaluation result/answer.
 */
export const VAR_ANS_ID = '$ans'
