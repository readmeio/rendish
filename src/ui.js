import { inspect } from "node:util";
import color from "colors-cli/safe";
import { table, getBorderCharacters } from "table";

/**
 * All subcommands should return a DataWrapper or undefined
 *
 * @typedef DataWrapper
 * @prop {"table"|"json"} type? the type of data that's been returned
 * @prop {any} data the actual data
 */

/**
 * draw a table without a border
 *
 * @param {any} data
 */
export function nbTable(data) {
  const output = table(data, {
    border: getBorderCharacters("void"),
    columnDefault: {
      paddingLeft: 0,
      paddingRight: 1,
    },
    drawHorizontalLine: () => false,
  });
  console.log(output);
}

/**
 * @param {DataWrapper} data
 * @param {any} options
 */
export function display(data, options) {
  const { json } = options;
  if (!data?.type) return;
  switch (data.type) {
    case "table":
      json ? console.log(JSON.stringify(data.data)) : nbTable(data.data);
      break;
    case "json":
      json
        ? console.log(data.data)
        : console.log(inspect(JSON.parse(data.data)));
      break;
  }
}

/**
 * print an error and quit
 *
 * @param {string} err
 * @param {number} [code]
 * @returns never
 */
export function die(err, code = 1) {
  console.log(color.red.bold(err));
  process.exit(code);
}
