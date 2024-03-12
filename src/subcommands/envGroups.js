import {
  fetchEnvGroup,
  fetchEnvGroups,
  fetchEnvGroupServices,
  fetchTeams,
} from "../graphql.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rendish [<options>] envGroups <subcommand> [args]

${color.yellow("envGroups")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

list                           list available environment groups
listVars <envGroup> [<filter>] list variables in an environment group by group
                               id or name and filter by an optional filter
services <envGroup> [<filter>] list services attached to the given env group
                               and optionally filter them

EXAMPLES

List the environment variables in the staging environment group:

  rendish listVars staging

List the environment variables in the staging environment group that contain
"GOOGLE" in the key or value:

  rendish listVars staging GOOGLE

List the services attached to the staging environment that have "queue" in the
name:

  rendish listVars services queue
`);
}

/**
 * given an EnvGroup, count up how many elements are variables and how many
 * are secret files. Returns an array [# of variables, # of secret files]
 *
 * @param {import('../graphql.js').EnvVar[]} grp
 * @returns {[number, number]} number of variables, number of secret files
 */
function countVars(grp) {
  const l = grp.length;
  const nvars = grp.filter((e) => !e.isFile).length;
  return [nvars, l - nvars];
}

/**
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @returns {Promise<import('../ui.js').DataWrapper>}
 */
async function listEnvGroups(token, user) {
  // for now, just assume that we want the first team. revisit
  const { id: teamId } = (await fetchTeams(token, user))[0];

  const envGroups = await fetchEnvGroups(token, teamId);

  return {
    type: "table",
    data: [["name", "id", "variables", "secret files"]].concat(
      envGroups.map((e) => [
        e.name,
        e.id,
        countVars(e.envVars)[0].toString(),
        countVars(e.envVars)[1].toString(),
      ]),
    ),
  };
}

/**
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @param {string} name
 * @returns {Promise<string|undefined>} envGroupId
 */
async function findEnvGroupByName(token, user, name) {
  const { id: teamId } = (await fetchTeams(token, user))[0];

  const envGroups = await fetchEnvGroups(token, teamId);

  return envGroups.find((e) => e.name == name)?.id;
}

/**
 * Given a string that may represent an envGroup Id or name, resolve it to an envGroup id
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @param {string} envGroupIdOrName
 * @returns {Promise<string>} envGroupId
 */
async function resolveEnvGroup(token, user, envGroupIdOrName) {
  if (!envGroupIdOrName) {
    die(
      `You must provide a project id or name as the first argument to listEnvs`,
    );
  }

  const envGroupId = envGroupIdOrName.startsWith("evg-")
    ? envGroupIdOrName
    : await findEnvGroupByName(token, user, envGroupIdOrName);

  if (!envGroupId) {
    die(`Unable to find env group from id or name ${envGroupIdOrName}`);
    throw new Error("unreachable");
  }

  // XXX TODO: here's where I'm at, typescript is unhappy bc it doesn't
  // understand that the die command kills the program
  return envGroupId;
}

/**
 * Given a string that may represent an envGroup Id or name, resolve it to an envGroup id
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @param {string[]} args
 * @returns {Promise<import('../ui.js').DataWrapper>}
 */
async function listEnvGroup(token, user, args) {
  const envGroupId = await resolveEnvGroup(token, user, args[0]);
  const envGroup = await fetchEnvGroup(token, envGroupId);
  const filter = args[1];
  let vars = envGroup.envVars.map((e) => [e.id, e.key, e.value]);
  if (filter) {
    vars = vars.filter(
      ([, key, value]) => key.includes(filter) || value.includes(filter),
    );
  }

  return {
    type: "table",
    data: [["id", "key", "value"]].concat(vars),
  };
}

/**
 * Return the services attached to an environment group
 *
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @param {string[]} args
 * @returns {Promise<import('../ui.js').DataWrapper>}
 */
async function listServicesForEnvGroup(token, user, args) {
  const envGroupId = await resolveEnvGroup(token, user, args[0]);
  const serviceObjs = await fetchEnvGroupServices(token, envGroupId);
  const filter = args[1];
  let services = serviceObjs.map((s) => [s.name, s.id]);
  if (filter) {
    services = services.filter(
      ([name, sid]) => name.includes(filter) || sid.includes(filter),
    );
  }

  return {
    type: "table",
    data: [["name", "id"]].concat(services),
  };
}

/**
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @param {string[]} args
 * @returns Promise<import('../ui.js').DataWrapper?>
 */
export function envGroups(token, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    usage();
    return Promise.resolve(null);
  }

  const subcommand = argv._[0];

  /** @type Record<string,
   *              (token: string, user: import('../graphql.js').User, args:string[]) =>
   *                  Promise<import('../ui.js').DataWrapper>>
   */
  const subcommands = {
    list: listEnvGroups,
    listVars: listEnvGroup,
    services: listServicesForEnvGroup,
  };

  if (subcommand in subcommands) {
    return subcommands[subcommand](token, user, args.slice(1));
  } else {
    // XXX TODO: typescript also unable to believe that this command kills the program
    die(`Unable to find subcommand ${subcommand}`);
    throw new Error("unreachable");
  }
}
