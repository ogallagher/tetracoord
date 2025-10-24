import { Tetracoordinate } from "../../src/tetracoord/vector/tetracoordinate"
import { CartesianCoordinate } from "../../src/tetracoord/vector/cartesian"
import { ExpressionInnerValue, ExpressionValueCollection } from "../../src/tetracoord/calculator/expression/const"
import { ExpressionCalculator } from "../../src/tetracoord/calculator/expression/expressioncalculator"

export default class VectorAverageMagnitude extends ExpressionCalculator {  
  /**
   * @param args Collection of vectors
   * @returns Average magnitude.
   */
  eval(args?: ExpressionValueCollection): ExpressionInnerValue {
    try {
      // handle no args
      if (args === undefined) {
        return 0
      }

      const vectors = args.items as (Tetracoordinate|CartesianCoordinate)[]
      const count = vectors.length
      const sum = (
        vectors
        .map(v => {
          if (v instanceof Tetracoordinate) {
            return v.magnitudeFromCartesian 
          }
          else {
            return v.magnitude
          }
        })
        .reduce((sum, mag) => sum + mag)
      )

      return sum / count
    }
    catch (err) {
      throw new EvalError(`failed to calculate average magnitude of ${args}`, {cause: err})
    }
  }
}
