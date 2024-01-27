import { fetchTeams, fetchServices } from "../graphql.js";
import { tailLogs } from "../log_socket.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] logs <subcommand> [args]

${color.yellow("logs")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

tail <serviceIdOrName>   tail logs for the service given by Id or Name
`);
}

async function findServiceByName(token, user, teamId, name) {
  const services = await fetchServices(token, teamId);

  return services.find((s) => s.name == name);
}

async function findServiceById(token, user, teamId, serviceId) {
  const services = await fetchServices(token, teamId);

  return services.find((s) => s.id == serviceId);
}

async function tailService(token, user, args) {
  const { id: teamId } = (await fetchTeams(token, user))[0];

  if (!args[0]) {
    die(
      `You must provide a service id or name as the first argument to tailService`
    );
  }

  const service = args[0].startsWith("svc-")
    ? await findServiceById(token, user, teamId, args[0])
    : await findServiceByName(token, user, teamId, args[0]);

  if (!service.id) {
    die(`Unable to find env group from id or name ${args[0]}`);
  }

  tailLogs(token, service.id, service.owner.id);
}

export async function logs(idToken, user, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  const subcommands = {
    tail: tailService,
  };

  if (subcommand in subcommands) {
    await subcommands[subcommand](idToken, user, args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
  }
}
