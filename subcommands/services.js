import { fetchTeams, fetchProjects } from "../graphql.js";
import { nbTable } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] [<command>] [args]

${color.yellow("services")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

For help with any subcommand, use ${color.yellow('`rb <command> <subcommand> --help`')}

list    list available projects
`);
}

async function listProjects(idToken, user) {
  // for now, just assume that we want the first team. revisit
  const { id: teamID } = (await fetchTeams(idToken, user))[0];

  const projects = await fetchProjects(idToken, teamID);

  nbTable(
    [["name", "id", "# of environments"]].concat(
      projects.map((p) => [p.name, p.id, p.environments.length])
    )
  );
}

export async function projects(idToken, user, args) {
  const argv = minimist(args);

  if (argv.help) {
    return usage();
  }

  const subcommand = argv._[0];

  const subcommands = {
    list: listProjects,
  }
  
  if (subcommand in subcommands) {
    subcommands[subcommand](idToken, user, args);
  } else {
    console.log(color.red.bold(`Unable to find subcommand ${subcommand}`));
  }
}
