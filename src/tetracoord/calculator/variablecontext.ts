import { deserialize, serialize } from "../serializer";
import type { SerialExprVal, SerialVarCtx } from "../serializer/const"
import type { ExpressionValue } from "./expression/const";
import type { VarCtxId } from "./symbol"
import { VAR_CTX_ID, VAR_ANS_ID, VAR_ACCESS_DOT_OP } from "./symbol"

/**
 * Corresponds to `var` expression variable that acts as a global namespace, similar to `window` in frontend JS.
 */
export class VariableContext implements SerialVarCtx {
  type: VarCtxId = VAR_CTX_ID;

  [VAR_ANS_ID]: ExpressionValue

  values: {[key: string]: ExpressionValue} = {}

  get(key: string) {
    if (key === VAR_ANS_ID) {
      return this[VAR_ANS_ID]
    }
    else {
      return this.values[key]
    }
  }

  /**
   * Update a member of `this.values`.
   * @throws {RangeError} Caller attempts to set `this.$ans`.
   */
  set(key: string, val: ExpressionValue) {
    if (key === VAR_ANS_ID) {
      throw new RangeError(
        `expression cannot overwrite reserved variable ${VAR_CTX_ID}${VAR_ACCESS_DOT_OP}${VAR_ANS_ID}`
      )
    }
    else {
      this.values[key] = val
    }
  }

  /**
   * Add and overwrite values while retaining any that this context already has.
   * 
   * @param varCtx Other variable context.
   */
  async load(varCtx: SerialVarCtx) {
    this[VAR_ANS_ID] = await deserialize(varCtx[VAR_ANS_ID])

    for (let [key, val] of Object.entries(varCtx.values)) {
      this.values[key] = await deserialize(val as SerialExprVal)
    }
  }

  save(): SerialVarCtx {
    const ctx = new VariableContext() as SerialVarCtx

    ctx[VAR_ANS_ID] = serialize(this[VAR_ANS_ID])

    for (let [key, val] of Object.entries(this.values)) {
      ctx.values[key] = serialize(val as SerialExprVal)
    }

    return ctx
  }
}