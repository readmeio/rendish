import {
  fetchTeams,
  fetchProjects,
  fetchProjectResources,
} from "../graphql.js";
import { die, nbTable } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] [<command>] [args]

${color.yellow("services")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

For help with any subcommand, use ${color.yellow(
    "`rb <command> <subcommand> --help`"
  )}

list               list available services
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

async function findProjectIDByName(idToken, user, name) {
  // for now, just assume that we want the first team. revisit
  const { id: teamID } = (await fetchTeams(idToken, user))[0];

  const projects = await fetchProjects(idToken, teamID);

  return projects.find((p) => p.name == name)?.id;
}

async function listProjectEnvs(idToken, user, args) {
  let projectID = args[0];

  if (!projectID) {
    die(
      `You must provide a project ID or name as the first argument to listEnvs`
    );
  }

  if (!projectID.startsWith("prj-")) {
    //assume that if the argument doesn't start with prj-, it represents a
    //project name not a project id
    projectID = await findProjectIDByName(idToken, user, projectID);
  }

  if (!projectID) {
    die(`Unable to find project from ID or name ${args[0]}`);
  }

  console.error("projectID", projectID);
  const projectResources = await fetchProjectResources(idToken, projectID);
  if (!projectResources) {
    die(`Unexpected error getting resources for projectID ${projectID}`);
  }

  nbTable(
    [
      ["name", "id", "services", "databases", "redises", "environment groups"],
    ].concat(
      projectResources.environments.map((e) => [
        e.name,
        e.id,
        e.services.length,
        e.redises.length,
        e.envGroups.length,
      ])
    )
  );
}

export async function projects(idToken, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  const subcommands = {
    list: listProjects,
    listEnvs: listProjectEnvs,
    // listServices: listProjectServices,
  };

  if (subcommand in subcommands) {
    await subcommands[subcommand](idToken, user, args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
  }
}
