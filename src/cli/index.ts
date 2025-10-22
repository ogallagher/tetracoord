#!/usr/bin/env node
/**
 * Tetracoord engine cli driver.
 */

import pino, { Level } from "pino"
import yargs, { boolean } from "yargs"
import { hideBin } from "yargs/helpers"
import { RadixType, parsePowerScalar, PowerScalar } from "../tetracoord/scalar"
import { VectorType, Tetracoordinate, CartesianCoordinate } from "../tetracoord/vector"
import { evalExpression, logger as cLogger } from "../tetracoord/calculator"
import { VAR_ACCESS_DOT_OP, VAR_ANS_ID, VAR_CTX_ID } from "../tetracoord/calculator/symbol"
import type { ExpressionValue } from "../tetracoord/calculator/const"
import { VariableContext } from "../tetracoord/calculator/variablecontext"
import type { Serializable, SerialVarCtx } from "../tetracoord/serializer/const"
import * as readline from "node:readline/promises"
import path from "node:path"
import { loadFile, saveFile } from "./filesystem"

const logStream = pino.destination({
  dest: process.stdout.fd,
  sync: false,
})

type CliName = 'tcoord-cli'
const CLI_NAME: CliName = 'tcoord-cli'

const logger = pino(
  {
    name: CLI_NAME,
    level: 'warn'
  },
  logStream
)

enum OptKey {
  Expr = 'expression',
  ScalarRadix = 'scalar-format-radix',
  VectorFormat = 'vector-format-type',
  File = 'file',
  ReloadFile = 'reload-file',
  LogLevel = 'log-level',
  Help = 'help',
  Version = 'version',
  Quit = 'quit'
}

type Opts = {
  [OptKey.Expr]?: string
  [OptKey.ScalarRadix]?: RadixType
  [OptKey.VectorFormat]?: VectorType
  [OptKey.File]?: string
  [OptKey.ReloadFile]?: boolean
  [OptKey.LogLevel]?: Level
  [OptKey.Quit]?: boolean
}

/**
 * A wrapper around whatever content we expect to save and load to a file.
 */
interface SerialCliContext extends Serializable {
  type: CliName

  [VAR_CTX_ID]: VariableContext|SerialVarCtx
}
class CliContext implements SerialCliContext {
  type = CLI_NAME;

  [VAR_CTX_ID] = new VariableContext()
}

const FILE_PATH_DEFAULT = 'default.tcoord-data.json'
let optsPrev: Opts = {
  [OptKey.ReloadFile]: true
}
let cliCtx = new CliContext()

// TODO fix flushLoggers
async function flushLoggers() {  
  await Promise.all([logger, cLogger].map(l => {
    return new Promise((res) => l.flush(res))
  }))
  await new Promise((res) => logStream.flush(res))
}

/**
 * @param loggers Loggers to flush before writing to the console.
 * @param msg Value passed to `console.log`.
 */
async function consoleLog(msg: any) {
  await flushLoggers()
  console.log(msg)
}

/**
 * Prompt for new opts to enable program loop with same inputs as first iteration.
 */
async function getArgV() {
  await flushLoggers()

  const rl: readline.Interface = readline.createInterface({
    input: process.stdin,
    // output to stderr avoids interfering with pino logger default output to stdout
    output: process.stdout
  })

  const argv = await rl.question('[--help for available options]\n[opts]: ')
  
  rl.close()
  return argv
}

const optParser = (
  yargs()
  .usage(
    'Tetracoord CLI driver. Supported functions: expression calculator.'
  )
  .help(false)
  .option(OptKey.Help, {
    alias: 'h',
    type: 'boolean',
    default: false,
  })
  .version(false)
  .option(OptKey.Expr, {
    alias: 'e',
    string: true,
    demandOption: false,
    description: (
      'Calculator input expression to evaluate.'
    )
  })
  .option(OptKey.ScalarRadix, {
    alias: 's',
    choices: [RadixType.D, RadixType.B, RadixType.Q],
    default: undefined,
    description: (
      'Output format (radix) for scalar values: [d]ecimal, [q]uaternary, [b]inary. '
      + 'Alternative is to convert within the expression; ex. "0d1 * 0q32" will '
      + 'convert to the radix of the left operand (decimal).'
    )
  })
  .option(OptKey.VectorFormat, {
    alias: 'v',
    choices: [VectorType.CCoord, VectorType.TCoord],
    default: undefined,
    description: (
      'Output format for vector values: cartesian or tetracoord. '
      + 'Alternative is to convert within the expression; ex. "cc[tc[]]"'
    )
  })
  .option(OptKey.File, {
    alias: 'f',
    default: path.resolve(FILE_PATH_DEFAULT),
    description: (
      `Path to config/data file where persistent state like expression result variable `
      + `${VAR_CTX_ID}${VAR_ACCESS_DOT_OP}${VAR_ANS_ID} are saved and loaded.`
    )
  })
  .option(OptKey.ReloadFile, {
    alias: 'r',
    type: 'boolean',
    default: undefined,
    description: (
      `Reload from the config/data file. Otherwise, the file is only read before the first expression is evaluated, `
      + `and when the path (--${OptKey.File}) changes.`
    )
  })
  .option(OptKey.LogLevel, {
    alias: 'l',
    choices: ["fatal", "error", "warn", "info", "debug", "trace"],
    default: undefined,
    description: 'logging level'
  })
  .option(OptKey.Quit, {
    alias: 'q',
    type: 'boolean',
    description: 'Quit program.'
  })
)

function getOpts(argv: string[]|string): Opts|undefined {
  let opts = optParser.parse(argv) as Opts

  Object.keys(optsPrev).forEach((key) => {
    // optsPrev is only used when current opt is not defined
    if (opts[key] === undefined) {
      opts[key] = optsPrev[key]
    }
  })

  const filePath = opts[OptKey.File]
  if (filePath !== undefined && filePath !== optsPrev[OptKey.File]) {
    logger.debug(`file changed to path=${filePath}; enable reload`)
    opts[OptKey.ReloadFile] = true
  }

  return opts
}

/**
 * Persist previous opts as new defaults.
 */
function setOptDefaults(opts: Opts) {
  [
    OptKey.LogLevel, 
    OptKey.ScalarRadix, OptKey.VectorFormat,
    OptKey.File, OptKey.ReloadFile,
    OptKey.Quit
  ].forEach((key) => {
    if (opts[key] !== undefined) {
      optsPrev[key] = opts[key]
    }
  })
}

function formatValue(res: ExpressionValue, formatRadix?: RadixType, formatVector?: VectorType): string {
  if (res instanceof Tetracoordinate) {
    return (
      formatVector === VectorType.CCoord ? res.toCartesianCoord() : res
    ).toString(formatRadix)
  }
  else if (res instanceof CartesianCoordinate) {
    return (
      formatVector === VectorType.TCoord ? Tetracoordinate.fromCartesianCoord(res) : res
    ).toString(formatRadix)
  }
  else if (res instanceof PowerScalar) {
    return res.toString(formatRadix)
  }
  else if (typeof res === 'number' && formatRadix !== undefined) {
    return parsePowerScalar(res, RadixType.D).toString(formatRadix, false)
  }
  else {
    return res.toString()
  }
}

async function main(opts: Opts) {
  logger.level = opts[OptKey.LogLevel] || logger.level
  cLogger.level = opts[OptKey.LogLevel] || cLogger.level

  logger.debug('begin')
  logger.debug({ opts })

  if (opts[OptKey.Help]) {
    const help = await optParser.getHelp()
    await consoleLog(help)
    return opts
  }

  const expr = opts[OptKey.Expr]
  if (expr === undefined || expr.trim().length === 0) {
    await consoleLog('no expression provided to evaluate')
    return opts
  }

  // load context
  if (opts[OptKey.ReloadFile]) {
    const filePath = opts[OptKey.File]
    logger.info(`load context from path=${filePath}`)

    try {
      const fileCtx = await loadFile(filePath) as SerialCliContext
      cliCtx[VAR_CTX_ID].load(fileCtx[VAR_CTX_ID])
    }
    catch (err) {
      logger.info(err)
      await consoleLog(`skip failed load context from ${filePath}. ${err}`)
    }

    // disable reload content until requested again
    opts[OptKey.ReloadFile] = false
  }

  // evaluate
  const res = evalExpression(expr, cliCtx[VAR_CTX_ID])
  logger.info(`raw result = ${res}`)

  // show result
  const resStr = formatValue(res, opts[OptKey.ScalarRadix], opts[OptKey.VectorFormat])
  await consoleLog(`result = ${resStr}`)

  logger.debug('end')
  return opts
}

function saveContext() {
  console.log(`save context to ${optsPrev[OptKey.File]}`)
  // serialize values
  const ctx = cliCtx as SerialCliContext
  ctx[VAR_CTX_ID] = cliCtx[VAR_CTX_ID].save()

  // write to file
  saveFile(
    optsPrev[OptKey.File], 
    ctx
  )
}

async function wrapper(argv?: string[]|string) {
  await new Promise((res) => {
    if (argv) {
      res(argv)
    }
    else {
      getArgV()
      .then(res)
    }
  })
  .then(getOpts)
  .then(main)
  .then(setOptDefaults)
  .then(() => {
    if (!optsPrev[OptKey.Quit]) {
      return wrapper()
    }
    else {
      logger.info('explicit quit')
      process.exit()
    }
  })
}

// register cleanup methods
process.on('exit', () => {
  saveContext()
})

// execute
wrapper(hideBin(process.argv))
.catch((err) => {
  flushLoggers()
  .then(() => {
    if (err.code !== 'ABORT_ERR') {
      throw err
    }
    else {
      // readline.question prompt was aborted; normal program exit.
      process.exit()
    }
  })
})
