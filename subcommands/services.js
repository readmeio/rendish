import { fetchTeams, fetchServices } from "../graphql.js";
import { nbTable } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] services <subcommand> [args]

${color.yellow("services")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

list    list all services
`);
}

async function listServices(idToken, user) {
  // for now, just assume that we want the first team. revisit
  const { id: teamID } = (await fetchTeams(idToken, user))[0];

  const services = await fetchServices(idToken, teamID);

  nbTable(
    [["name", "id", "state", "type", "deploy type", "slug"]].concat(
      services.map((s) => [
        s.name,
        s.id,
        s.state,
        s.userFacingTypeSlug,
        s.env?.name,
        s.slug,
      ])
    )
  );
}

export async function services(idToken, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  const subcommands = {
    list: listServices,
  };

  if (subcommand in subcommands) {
    await subcommands[subcommand](idToken, user, args);
  } else {
    console.log(color.red.bold(`Unable to find subcommand ${subcommand}`));
  }
}
