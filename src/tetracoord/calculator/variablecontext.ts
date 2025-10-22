import { deserialize, serialize } from "../serializer";
import type { SerialExprVal, SerialVarCtx } from "../serializer/const"
import type { ExpressionValue } from "./const"
import type { VarCtxId } from "./symbol"
import { VAR_CTX_ID, VAR_ANS_ID } from "./symbol"

/**
 * Corresponds to `var` expression variable that acts as a global namespace, similar to `window` in frontend JS.
 */
export class VariableContext implements SerialVarCtx {
  type: VarCtxId = VAR_CTX_ID;

  [VAR_ANS_ID]: ExpressionValue

  values: {[key: string]: ExpressionValue} = {}

  /**
   * Add and overwrite values while retaining any that this context already has.
   * 
   * @param varCtx Other variable context.
   */
  load(varCtx: SerialVarCtx) {
    this[VAR_ANS_ID] = deserialize(varCtx[VAR_ANS_ID])

    for (let [key, val] of Object.entries(varCtx.values)) {
      this.values[key] = deserialize(val as SerialExprVal)
    }
  }

  save(): SerialVarCtx {
    const ctx = this as SerialVarCtx

    ctx[VAR_ANS_ID] = serialize(ctx[VAR_ANS_ID])

    for (let [key, val] of Object.entries(ctx.values)) {
      ctx.values[key] = serialize(val as SerialExprVal)
    }

    return ctx
  }
}