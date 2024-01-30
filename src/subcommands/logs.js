import { fetchTeams, fetchServices } from "../graphql.js";
import { tailLogs } from "../log_socket.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rendish [<options>] logs <subcommand> [args]

${color.yellow("logs")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

tail <serviceIdOrName>   tail logs for the service given by Id or Name
`);
}

/**
 * @param {string} token
 * @param {string} teamId
 * @param {string} name
 * @returns {Promise<import("../graphql.js").Server|undefined>} envGroupId
 */
async function findServiceByName(token, teamId, name) {
  const services = await fetchServices(token, teamId);

  return services.find((s) => s.name == name);
}

/**
 * @param {string} token
 * @param {string} teamId
 * @param {string} serviceId
 * @returns {Promise<import("../graphql.js").Server|undefined>} envGroupId
 */
async function findServiceById(token, teamId, serviceId) {
  const services = await fetchServices(token, teamId);

  return services.find((s) => s.id == serviceId);
}

/**
 * Tail the logs for the service given as args[0]
 *
 * @param {string} token
 * @param {import("../graphql.js").User} user
 * @param {string[]} args
 */
async function tailService(token, user, args) {
  const { id: teamId } = (await fetchTeams(token, user))[0];

  if (!args[0]) {
    die(
      `You must provide a service id or name as the first argument to tailService`
    );
  }

  const service = args[0].startsWith("svc-")
    ? await findServiceById(token, teamId, args[0])
    : await findServiceByName(token, teamId, args[0]);

  if (!service?.id) {
    die(`Unable to find env group from id or name ${args[0]}`);
    throw Error("unreachable");
  }

  tailLogs(token, service.id, service.owner.id);
}

/**
 * @param {string} token
 * @param {import("../graphql.js").User} user
 * @param {string[]} args
 */
export function logs(token, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  /** @type Record<string, (token: string, user: import("../graphql.js").User, args:string[]) => void> */
  const subcommands = {
    tail: tailService,
  };

  if (subcommand in subcommands) {
    subcommands[subcommand](token, user, args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
  }
}
