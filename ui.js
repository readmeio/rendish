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

export function die(err, code) {
  console.log(color.red.bold(err));
  process.exit(code || 1);
}
