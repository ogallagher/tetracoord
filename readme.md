# Tetracoord Explorer

Tetracoordinate engine and calculator.

![tetracoord explorer preview](docs/img/tcoord_ccoord_displays_2022-08-06.png)
> Above image is from [tetracoord-explorer](https://github.com/ogallagher/tetracoord-explorer), which visualizes tetracoordinate system defined in this repo.

## Install

The node package is available at [npmjs/tetracoord](https://www.npmjs.com/package/tetracoord).

```shell
# --global opt assumes we are not using this as a library, but simply want to run the cli command
npm install --global tetracoord

# run installed cli command from any filesystem location
npx tcoord
```

## CLI driver

Run cli driver with `npx tcoord -e "<expression>"` (or `npm run cli -- -e "<expression>"` if within the source repo) to evaluate an arithmetic or logical expression with scalar and vector terms. 
See `npx tcoord --help` for all options.

The program loops, prompting for a new set of opts after each expression is evaluated. So running with no input simply as `npm run cli` is convenient.

Examples:

```shell
# Evaluate scalar sum of three terms (5 + 5 + 5), each defined with a different radix
npm run cli -- -e "5 + 0q11 + 0b101" -l info
# result = 0d15

# Show same scalar result as quaternary
npm run cli -- -e "5 + 0q11 + 0b101" -s b
# result = 0q33

# Show same scalar result as binary
npm run cli -- -e "var.$ans" -s b
# result = 0b1111
```

```shell
# Show that -tc[0.111...] equals tc[1.0]
npm run cli -- -e "tc[0.1i] * -1"
# result = tc[0q1]
```

```shell
# Create a cartesian coordinate at (3 * cos(pi/6), 3 * sin(pi/6)) and convert to a tetracoordinate.
npm run cli -- -e "tc[cc[3*cospi6, 3*sinpi6]]"
# result = tc[0q22]

# Confirm that the same tetracoordinate 22 equals -202 (radix is implied 10 for ccoord, 4 for tcoord).
npm run cli -- -e "tc[cc[3*cospi6, 3*sinpi6]] === -tc[202]"
# result = true
```

There are many more example expressions `test/test_calculator.ts` as well.

### CLI driver data/config file

On exit, the cli calculator saves [`var`](#calculator-variables) to default path `default.tcoord-data.json`, and on load it reads from the same path. As such, `var` is persisted between runs.<br/>
Below is an example file.

<details>
<summary><code>default.tcoord-data.json</code></summary>

```js
{
  "type": "tcoord-cli",
  // begin variable context
  "var": {
    "type": "var",
    // reserved variable var.$ans
    "$ans": {
      "type": "ps",
      "digits": [
        4
      ],
      "radix": "b",
      "power": 0,
      "sign": 1,
      "irrational": false,
      "levelOrder": "h"
    },
    // custom variables
    "values": {
      // primitive scalar
      "a": 15,
      // expression calculator
      "vecAvg": {
        "type": "exprcalc",
        "filePath": "test/res/exprcalc_vectoravg.ts"
      },
      // binary power scalar
      "two": {
        "type": "ps",
        "digits": [
          2
        ],
        "radix": "b",
        "power": 0,
        "sign": 1,
        "irrational": false,
        "levelOrder": "h"
      }
    }
  }
}
```
</details>

## Calculator expression syntax

Specification for the expression that the cli calculator can evaluate.

_The value for **category** in the below table is implied same as previous row if not written._

### Acronyms used

- **ccoord** = cartesian coordinate
- **tcoord** = tetracoordinate

### Expression symbols/terms

| category | name | symbol | examples | description |
| --- | --- | --- | --- | --- |
| literal primitive | number | | `-0.5` `16` | Generally, any term that would be parsed in JS as a `number`. |
| | boolean | | `true` `false` | Boolean keywords. |
| | | | | |
| trig constant | | `cospi6` | | Equal to `cos(π/6)`. Important for conversion between tcoord and ccoord. tcoords `2` and `3`, when converted to ccoords, have `x` component `-cospi6` and `cospi6`, respectively. |
| | | `sinpi6` | | Equal to `cos(π/6)`. tcoords `2` and `3`, when converted to ccoords, have `y` component `-sinpi6`. |
| | | | | |
| literal scalar | power scalar | `0<radix><number><irrational-suffix>` | `-0d0.5`<br/> `0q0.2`<br/> `0b0.1` `0q320.1i`<br/> `-12.3...` | Numbers expressed in 1 of three supported `<radix>`: **d** (decimal, base 10), **q** (quaternary, base 4), **b** (binary, base 2). These are internally represented as instances of a custom `PowerScalar` class, which can be internally converted to primitive `number` for arithmetic. The optional `<irrational-suffix>` of `i` or `...` indicates that the least significant nonzero digit is repeated infinitely. |
| | | | | |
| literal vector | cartesian coordinate | `cc[<x>,<y>]` or `cc[<vector>]` | `cc[0,1i]` `cc[cospi6, -sinpi6]` `cc[tc[0]]` | A ccoord with `x` and `y` numeric components. These can be primitive or power scalar numbers, as well as expressions that evaluate to a number. If specified as `<vector>`, this can be a vector value, useful for converting from a tcoord. |
|  | tetracoordinate | `tc[<s>]` | `-tc[1]` `tc[3.21i]` `tc[cc[0,0]]` | A tcoord with a single scalar `s` numeric value. Like ccoord literals, component `<s>` can be anything that evaluates to a number. Or, `<vector>` can be a vector value, useful for converting from a ccoord. |
| **scalar** arithmetic operator | scalar add | `+` | `12 + 0b11` | Scalar add. Operands are numeric scalar values. |
| | scalar subtract, negate | `-` | `0q21 - 4` `-0d10` | Scalar subtract. Operands are numeric scalar values. |
| | scalar absolute value | `\|x\|` | `\|-0q302i\|`<br/> `\|3-5\|` | Scalar absolute value. Operand is a single numeric scalar value. |
| | scalar multiply | `*` | `5 * 0q23 * 0.1` | Scalar multiply. Operands are numeric scalar values. |
| | scalar divide | `/` | `55 / 11 / 10` | Scalar divide. Operands are numeric scalar values. |
| | scalar exponent/power | `**` | `2 ** 0q100 ** 0b0.1` | Scalar exponent. Operands are numeric scalar values. |
| | | | | |
| **vector** arithmetic operator | vector add | `+` | `tc[0q1] + tc[0q3] + tc[0q3]` | Vector add. |
| | vector subtract, negate | `-` | `tc[0q1] - tc[0q0.2 + 0q0.2]` | Vector subtract. |
| | vector magnitude | `\|<v>\|` | `\|tc[303]\|`<br/> `\|-2 * cc[3, 4]\|` | Get the magnitude of a vector. |
| | | | | _Note vector multiply and divide are not defined._ |
| | | | | |
| **semiscalar/hybrid** arithmetic operator | hybrid multiply | `*` | `0d1.0 * cc[6*1.5, 4*1.5]` | The result vector will have a magnitude multiplied by the scalar operand. |
| | hybrid divide | `/` | `cc[9,6] / 1.5` | The result vector will have a magnitude divided by the scalar operand. |
| | hybrid exponent/power | `<base>**<exp>` | `tc[0q2] ** 0d3` | Equivalent to normalizing as a unit vector and multiplying by the original magnitude raised to an exponent. |
| logical comparison | strict equality | `===` | `1/3 === 3i` `tc[1] === tc[cc[0,1]]` | Compares whether operands are equal. They can be any scalar or vector values, but must be first converted to the same type. |
| | strict inequality | `!==` | `33 !== 0q33` `tc[2] !== tc[cc[0,2]]` | Compares whether operands are not equal. Operands must be the same type. |
| group operator | | `(<e>)` | `(1+0q11) * 0b11**(2+0b11)` | Group terms to be control the order of operations and evaluate them first. |
| variable | variable reference | `var.<key>` or `var[<key>]` or `var["<key>"]` | `var.apple`<br/> `var[apple]`<br/> `var["apple"]` | All variables belong to a context variable `var`, analogous to `window` in frontend JS. They can store the result of any expression. |
| | variable assignment | `<var-ref> = <val>` | `var.nineteen = var[eight] + 0q20` | Assign a value to a variable. |
| method | expression calculator instance | `exprcalc["<filepath>"]` | `exprcalc["./fun1.js"]` | A custom expression calculator method that accepts a list of values and returns a value. Note that currently the file path must be a quoted string. | 

## Calculator behavior

### Scalar type and radix conversion

For all scalar operators, which support mixed type operands (primitive scalar and power scalar), the result type and radix is determined by the left operand. So `0q1 + 1` will yield `0q2`, not `2` (although these are the same scalar value, represented with different radix). Performing an arithmetic operation on a scalar is currently the only way to convert it within an expression, like the below example.

```txt
0b111 === (7 + 0b)
```

### Scalar implicit radix

Generally, any plain integer/float number written without the `0<radix>` prefx will be assumed **decimal**.
However, `tc[<s>]` tetracoord values are assumed **quaternary**.
So below are both `true`. 
```txt
tc[33] === tc[0q33]
tc[33] === tc[0d15]
```

## Rounding and precision error

> details pending

## Calculator variables

We can store values in variables, all of which are members of a context object referenced as `var` in an expression.
The reserved variable `var.$ans` always stores the result of the last evaluated expression.

```sh
npm run cli
# ...no expression provided, waits for input
-e 'var.two = 0b10'
# result = 0b10
-e 'var.two === var.$ans'
# result = true
-e 'var.two * 1.9i'
# result = 0b100
```

## Calculator methods/extensions

We can write custom methods that operate on scalar and vector values, and call them within calculator expressions.

To do so, create a module file (must be `js` if using compiled cli calculator, or `ts` if running from source with `tsx`) that default exports a single subclass of `ExpressionCalculator`. It can be a common-js or es-module file. See `test/res/exprcalc_vectoravg.ts` as an example, which returns the average magnitude of a list of vectors, which can be a mix of tcoord and tcoord values. Below is the same example, written in es-module JS, using the installed `tetracoord` package.

<details>
<summary><code>exprcalc_vectoravg.js</code></summary>

```javascript
import tc from "tetracoord"

export default class VectorAverageMagnitude extends tc.calculator.ExpressionCalculator {  
  /**
   * @param args Collection of vectors
   * @returns Average magnitude.
   */
  eval(args) {
    try {
      // handle no args
      if (args === undefined) {
        return 0
      }

      const vectors = args.items
      const count = vectors.length
      const sum = (
        vectors
        .map(v => {
          if (v instanceof tc.vector.Tetracoordinate) {
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
```
</details>

Now we can reference it within an expression when running the cli calculator.

```sh
npm run cli
# ...no expression provided, waits for input
-e 'exprcalc["test/res/exprcalc_vectoravg.ts"](tc[1], tc[2], tc[3])'
# result = 0.9999999910258843 (with precision error; ~ 1)

# we can also store in a named variable and call
-e 'var.vecAvg = exprcalc["test/res/exprcalc_vectoravg.ts"]'
-e '5 + var.vecAvg(tc[1], cc[-cospi6, -sinpi6], tc[3])'
# result ~ 6
```

## Develop

### Tests

Run all tests with `npm run test`. 

> **WARNING** Tests will fail if compiled JS files are present. Delete them with commands like `npm run clean` before running TS tests if after compiling. 

Pass opts and file patterns to `mocha` with `npm run _test -- <opts> <files>`.

- Run tests in a given file with 
`npm run _test -- <files>`.
- Run tests with a given substring in the description with 
`npm run _test -- -f <name> test/*`.
