import { fetchTeams, fetchServices, serviceMetrics } from "../graphql.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] services <subcommand> [args]

${color.yellow("services")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

list               list all services
metrics <service>  print metrics for a given service
`);
}

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
 * @param {import('../graphql.js').User} user
 * @param {string} serviceId
 * @returns {Promise<import('../graphql.js').Server>}
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
 * @param {import('../graphql.js').User} user
 * @param {string} serviceId
 * @returns {Promise<import('../graphql.js').Server>}
 */
async function getServiceByName(token, user, serviceName) {
  const { id: teamID } = (await fetchTeams(token, user))[0];
  const services = await fetchServices(token, teamID);

  return services.find((s) => s.name == serviceName);
}

/**
 * subcommand to get service metrics
 *
 * ex: `rb service metrics server-prod`
 *
 * @param {string} token
 * @param {import('../graphql.js').User} user
 * @param {string} serviceNameOrId
 * @returns {Promise<Any>}
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
  //const memory = metrics.metrics.samples.map((s) => [s.time, s.memory]);
  //const cpu = metrics.metrics.samples.map((s) => [s.time, s.cpu]);
  return {
    type: "table",
    data: [["time", "memory", "cpu"]].concat(
      metrics.metrics.samples.map((s) => [s.time, s.memory, s.cpu])
    ),
  };
}

export function services(idToken, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  const subcommands = {
    list: listServices,
    metrics: getServiceMetrics,
  };

  if (subcommand in subcommands) {
    return subcommands[subcommand](idToken, user, args.slice(1));
  } else {
    console.log(color.red.bold(`Unable to find subcommand ${subcommand}`));
  }
}
