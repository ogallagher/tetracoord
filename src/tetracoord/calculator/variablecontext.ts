import type { SerialExprVal, SerialVarCtx } from "../serializer/const"
import type { VarCtxId } from "./symbol"
import { VAR_CTX_ID, VAR_ANS_ID } from "./symbol"

/**
 * Corresponds to `var` expression variable that acts as a global namespace, similar to `window` in frontend JS.
 */
export class VariableContext implements SerialVarCtx {
  type: VarCtxId = VAR_CTX_ID;

  [VAR_ANS_ID]: SerialExprVal

  values = {}

  stringify(formatIndent?: number) {
    return JSON.stringify(this, undefined, formatIndent)
  }

  parse() {

  }
}