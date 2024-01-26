import { fetchEnvGroup, fetchEnvGroups, fetchTeams } from "../graphql.js";
import { die, nbTable } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] envGroups <subcommand> [args]

${color.yellow("projects")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

list                list available projects
listVars <envGroup> list variables in an environment group by group id or name
`);
}

/**
 * given an EnvGroup, count up how many elements are variables and how many
 * are secret files. Returns an array [# of variables, # of secret files]
 *
 * @param {import("../graphql.js").EnvVar[]} grp
 * @returns {[number, number]} number of variables, number of secret files
 */
function countVars(grp) {
  const l = grp.length;
  const nvars = grp.filter((e) => !e.isFile).length;
  return [nvars, l - nvars];
}

async function listEnvGroups(token, user) {
  // for now, just assume that we want the first team. revisit
  const { id: teamId } = (await fetchTeams(token, user))[0];

  const envGroups = await fetchEnvGroups(token, teamId);

  nbTable(
    [["name", "id", "variables", "secret files"]].concat(
      envGroups.map((e) => [
        e.name,
        e.id,
        countVars(e.envVars)[0],
        countVars(e.envVars)[1],
      ])
    )
  );
}

async function findEnvGroupByName(token, user, name) {
  const { id: teamId } = (await fetchTeams(token, user))[0];

  const envGroups = await fetchEnvGroups(token, teamId);

  return envGroups.find((e) => e.name == name)?.id;
}

async function listEnvGroup(token, user, args) {
  let envGroupId = args[0];

  if (!envGroupId) {
    die(
      `You must provide a project Id or name as the first argument to listEnvs`
    );
  }

  if (!envGroupId.startsWith("evg-")) {
    envGroupId = await findEnvGroupByName(token, user, envGroupId);
  }

  if (!envGroupId) {
    die(`Unable to find env group from id or name ${envGroupId}`);
  }

  const envGroup = await fetchEnvGroup(token, envGroupId);

  nbTable(
    [["id", "key", "value"]].concat(
      envGroup.envVars.map((e) => [e.id, e.key, e.value])
    )
  );
}

export async function envGroups(idToken, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  const subcommands = {
    list: listEnvGroups,
    listVars: listEnvGroup,
  };

  if (subcommand in subcommands) {
    await subcommands[subcommand](idToken, user, args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
  }
}
