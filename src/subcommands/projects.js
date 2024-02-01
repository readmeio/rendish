import {
  fetchTeams,
  fetchProjects,
  fetchProjectResources,
  isProjectId,
} from "../graphql.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

/**
 * @typedef {import("../graphql.js").User} User
 * @typedef {import("../graphql.js").ProjectID} ProjectID
 */

function usage() {
  console.log(`Usage: rendish [<options>] project <subcommand> [args]

${color.yellow("projects")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

list               list available projects
listEnvs <project> list environments within a project
`);
}

/**
 * @param {string} token
 * @param {User} user
 * @returns {Promise<{type: string, data: any}>}
 */
async function listProjects(token, user) {
  // for now, just assume that we want the first team. revisit
  const { id: teamId } = (await fetchTeams(token, user))[0];

  const projects = await fetchProjects(token, teamId);

  return {
    type: "table",
    data: [["name", "id", "# of environments"]].concat(
      projects.map((p) => [p.name, p.id, p.environments.length.toString()])
    ),
  };
}

/**
 * @param {string} token
 * @param {User} user
 * @param {string} name
 * @returns {Promise<ProjectID|undefined>}
 */
async function findProjectIdByName(token, user, name) {
  // for now, just assume that we want the first team. revisit
  const { id: teamId } = (await fetchTeams(token, user))[0];

  const projects = await fetchProjects(token, teamId);

  return projects.find((p) => p.name == name)?.id;
}

/**
 * @param {string} token
 * @param {User} user
 * @param {string[]} args
 * @returns {Promise<{type: string, data:any}>}
 */
async function listProjectEnvs(token, user, args) {
  if (!args[0]) {
    die(
      `You must provide a project Id or name as the first argument to listEnvs`
    );
  }

  const projectId = args[0].startsWith("prj-")
    ? args[0]
    : await findProjectIdByName(token, user, args[0]);

  if (!isProjectId(projectId)) {
    die(`Unable to find project from Id or name ${args[0]}`);
    throw new Error("unreachable");
  }

  const projectResources = await fetchProjectResources(token, projectId);
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
        e.services.length.toString(),
        e.databases.length.toString(),
        e.redises.length.toString(),
        e.envGroups.length.toString(),
      ])
    ),
  };
}

/**
 * @param {string} token
 * @param {import("../graphql.js").User} user
 * @param {string[]} args
 * @returns {Promise<{type: string, data:any}>|void}
 */
export function projects(token, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  /** @type Record<string, (token: string, user: import("../graphql.js").User, args:string[]) => Promise<{type: string, data: any}>> */
  const subcommands = {
    list: listProjects,
    listEnvs: listProjectEnvs,
    // listServices: listProjectServices,
  };

  if (subcommand in subcommands) {
    return subcommands[subcommand](token, user, args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
    throw new Error("unreachable");
  }
}
