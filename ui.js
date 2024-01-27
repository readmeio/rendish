import { inspect } from "node:util";

import color from "colors-cli/safe";
import { table, getBorderCharacters } from "table";

// draw a table without a border
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

export function die(err, code) {
  console.log(color.red.bold(err));
  process.exit(code || 1);
}
