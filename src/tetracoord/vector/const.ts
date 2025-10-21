export enum Orientation {
  UP = 'up',
  DOWN = 'dn',
  LEFT = 'lf',
  RIGHT = 'rt',
  CUSTOM = '',

  DEFAULT = UP
}

/**
 * Vector types.
 */
export enum VectorType {
  /**
   * Cartesian coordinate.
   */
  CCoord = 'cc',
  /**
   * Tetracoordinate.
   */
  TCoord = 'tc'
}
export type VectorTypeCC = VectorType.CCoord
export type VectorTypeTC = VectorType.TCoord
