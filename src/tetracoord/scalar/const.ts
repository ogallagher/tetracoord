export type RawScalar = number | Uint8Array
export enum RawScalarType {
  Number = 'number',
  Bytes = 'bytes'
}
export enum ScalarType {
  Raw = 'rs',
  PowerScalar = 'ps'
}
export type ScalarTypeRaw = ScalarType.Raw
export type ScalalarTypePower = ScalarType.PowerScalar

export type Sign = 1|-1
