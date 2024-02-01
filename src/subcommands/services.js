import { spawn } from "node:child_process";

import {
  fetchTeams,
  fetchServices,
  serverBandwidth,
  serviceMetrics,
} from "../graphql.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

/**
 * @typedef {import("../graphql.js").User} User
 * @typedef {import("../graphql.js").Server} Server
 * @typedef {import("../graphql.js").ProjectID} ProjectID
 * @typedef {import("../ui.js").DataWrapper} DataWrapper
 */

function usage() {
  console.log(`Usage: rendish [<options>] services <subcommand> [args]

${color.yellow("services")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

list                list all services
bandwidth <service> print bandwidth usage for a given service
metrics <service>   print metrics for a given service
ssh <service>       connect to <service> via ssh. Assumes you've added your ssh
                    key: https://docs.render.com/ssh-keys
`);
}

/**
 * @param {string} token
 * @param {User} user
 * @returns {Promise<DataWrapper>}
 */
async function listServices(token, user) {
  // for now, just assume that we want the first team. revisit
  const { id: teamID } = (await fetchTeams(token, user))[0];

  const services = await fetchServices(token, teamID);

  return {
    type: "table",
    data: [["name", "id", "state", "type", "deploy type", "slug"]].concat(
      services.map((s) => [
        s.name,
        s.id,
        s.state,
        s.userFacingTypeSlug,
        s.env?.name,
        s.slug,
      ])
    ),
  };
}

/**
 * get a Server by its id
 *
 * @param {string} token
 * @param {User} user
 * @param {string} serviceId
 * @returns {Promise<Server|undefined>}
 */
async function getServiceById(token, user, serviceId) {
  const { id: teamID } = (await fetchTeams(token, user))[0];
  const services = await fetchServices(token, teamID);

  return services.find((s) => s.id == serviceId);
}

/**
 * get a Server by its name
 *
 * @param {string} token
 * @param {User} user
 * @param {string} serviceName
 * @returns {Promise<Server|undefined>}
 */
async function getServiceByName(token, user, serviceName) {
  const { id: teamID } = (await fetchTeams(token, user))[0];
  const services = await fetchServices(token, teamID);

  return services.find((s) => s.name == serviceName);
}

/**
 * subcommand to get service metrics
 *
 * ex: `rendish service metrics server-prod`
 *
 * @param {string} token
 * @param {User} user
 * @param {string[]} args
 * @returns {Promise<DataWrapper>}
 */
async function getServiceMetrics(token, user, args) {
  const serviceNameOrId = args[0];

  const service = serviceNameOrId.startsWith("srv-")
    ? await getServiceById(token, user, serviceNameOrId)
    : await getServiceByName(token, user, serviceNameOrId);

  if (!service) {
    throw new Error(`Unable to find service ${serviceNameOrId}`);
  }

  const metrics = await serviceMetrics(token, service.id);
  return {
    type: "table",
    data: [["time", "memory", "cpu"]].concat(
      // @ts-ignore: typescript doesn't want to let us have numbers in the array
      metrics.metrics.samples.map((s) => [s.time, s.memory, s.cpu])
    ),
  };
}

/**
 * subcommand to get service bandwidth
 *
 * ex: `rendish service metrics server-prod`
 *
 * @param {string} token
 * @param {User} user
 * @param {string[]} args
 * @returns {Promise<DataWrapper>}
 */
async function getServiceBandwidth(token, user, args) {
  const serviceNameOrId = args[0];

  const service = serviceNameOrId.startsWith("srv-")
    ? await getServiceById(token, user, serviceNameOrId)
    : await getServiceByName(token, user, serviceNameOrId);

  if (!service) {
    throw new Error(`Unable to find service ${serviceNameOrId}`);
  }

  const metrics = await serverBandwidth(token, service.id);
  return {
    type: "table",
    data: [["time", "bandwidth"]].concat(
      // @ts-ignore: typescript doesn't want to let us have numbers in the array
      metrics.bandwidthMB.points.map((s) => [s.time, s.bandwidthMB])
    ),
  };
}

/**
 * subcommand to get service bandwidth
 *
 * ex: `rendish service metrics server-prod`
 *
 * @param {string} token
 * @param {User} user
 * @param {string[]} args
 * @returns {Promise<void>}
 */
async function openSshConnection(token, user, args) {
  const service = args[0].startsWith("srv-")
    ? await getServiceById(token, user, args[0])
    : await getServiceByName(token, user, args[0]);

  if (!service) {
    die(`Unable to find service ${args[0]}`);
    throw new Error("unreachable");
  }

  console.log(`connecting: ssh ${service.sshAddress}`);
  spawn("ssh", [service.sshAddress].concat(args.slice(1)), {
    stdio: "inherit",
  });
}

/**
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @param {string[]} args
 * @returns Promise<DataWrapper | void> | void
 */
export function services(token, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  /** @type Record<string, (token: string, user: User, args:string[]) => Promise<DataWrapper|void>> */
  const subcommands = {
    list: listServices,
    metrics: getServiceMetrics,
    bandwidth: getServiceBandwidth,
    ssh: openSshConnection,
  };

  if (subcommand in subcommands) {
    return subcommands[subcommand](token, user, args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
    throw new Error("unreachable");
  }
}
