import { Tetracoordinate } from "../../src/tetracoord/vector/tetracoordinate"
import { CartesianCoordinate } from "../../src/tetracoord/vector/cartesian"
import type { ExpressionInnerValue, ExpressionValueCollection } from "../../src/tetracoord/calculator/expression/const"
import { ExpressionCalculator } from "../../src/tetracoord/calculator/expression/expressioncalculator"

export default class VectorAverageMagnitude extends ExpressionCalculator {
  /**
   * @param args Collection of vectors
   * @returns Average magnitude.
   */
  eval(args: ExpressionValueCollection): ExpressionInnerValue {
    try {
      const vectors = args.items as (Tetracoordinate|CartesianCoordinate)[]
      const count = vectors.length
      const sum = (
        vectors
        .map(v => (v instanceof Tetracoordinate ? v.magnitudeFromCartesian : v.magnitude))
        .reduce((sum, mag) => sum + mag)
      )

      return sum / count
    }
    catch (err) {
      throw new EvalError(`failed to calculate average magnitude of ${args}`, {cause: err})
    }
  }
}
