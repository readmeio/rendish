import {
  fetchTeams,
  fetchProjects,
  fetchProjectResources,
} from "../graphql.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] project <subcommand> [args]

${color.yellow("projects")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

list               list available projects
listEnvs <project> list environments within a project
`);
}

async function listProjects(idToken, user) {
  // for now, just assume that we want the first team. revisit
  const { id: teamId } = (await fetchTeams(idToken, user))[0];

  const projects = await fetchProjects(idToken, teamId);

  return {
    type: "table",
    data: [["name", "id", "# of environments"]].concat(
      projects.map((p) => [p.name, p.id, p.environments.length])
    ),
  };
}

async function findProjectIdByName(idToken, user, name) {
  // for now, just assume that we want the first team. revisit
  const { id: teamId } = (await fetchTeams(idToken, user))[0];

  const projects = await fetchProjects(idToken, teamId);

  return projects.find((p) => p.name == name)?.id;
}

async function listProjectEnvs(idToken, user, args) {
  let projectId = args[0];

  if (!projectId) {
    die(
      `You must provide a project Id or name as the first argument to listEnvs`
    );
  }

  if (!projectId.startsWith("prj-")) {
    //assume that if the argument doesn't start with prj-, it represents a
    //project name not a project id
    projectId = await findProjectIdByName(idToken, user, projectId);
  }

  if (!projectId) {
    die(`Unable to find project from Id or name ${args[0]}`);
  }

  const projectResources = await fetchProjectResources(idToken, projectId);
  if (!projectResources) {
    die(`Unexpected error getting resources for projectId ${projectId}`);
  }

  return {
    type: "table",
    data: [
      ["name", "id", "services", "databases", "redises", "environment groups"],
    ].concat(
      projectResources.environments.map((e) => [
        e.name,
        e.id,
        e.services.length,
        e.databases.length,
        e.redises.length,
        e.envGroups.length,
      ])
    ),
  };
}

export function projects(idToken, user, args) {
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
    return subcommands[subcommand](idToken, user, args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
  }
}
