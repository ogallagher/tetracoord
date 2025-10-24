import path from "node:path"
import type { Serializable } from "../tetracoord/serializer"
import { readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs"

const prepareDir = (dirPath: string) => mkdirSync(dirPath, {recursive: true})

/**
 * @param filePath Path to source file.
 * @returns Parsed file content with {@linkcode JSON.parse}
 */
export function loadFile(filePath: string) {
  try {
    // file exists
    statSync(filePath)
    
    // read content
    let str = readFileSync(filePath, {encoding: 'utf-8'})

    // parse content
    return JSON.parse(str) as Serializable
  }
  catch (err) {
    throw new ReferenceError(`unable to read ${filePath}`, {cause: err})
  }
}

/**
 * @param filePath Path to target file.
 * @param fileData Content that has already been prepared for serialization with {@linkcode JSON.stringify}.
 */
export function saveFile(filePath: string, fileData: Serializable) {
  try {
    // parent dir exists
    prepareDir(path.dirname(filePath))

    // write content
    writeFileSync(filePath, JSON.stringify(fileData), {encoding: 'utf-8'})
  }
  catch (err) {
    throw new Error(`unable to write ${filePath}`, {cause: err})
  }
}