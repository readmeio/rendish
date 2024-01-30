#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { RequestError } from "./graphql.js";
import {
  auth,
  envGroups,
  login,
  logs,
  projects,
  services,
} from "./subcommands/index.js";
import { die, display } from "./ui.js";

import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] [<command>] [args]

render.com CLI

OPTIONS

--json:     display output as json
--help:     display this text

COMMANDS

For help with any command, use \`rb <command> --help\`

auth        auth to render
envGroups   render environment groups
logs        tail logs from a service
projects    render projects
services    render services
`);
}

if (!process.env.HOME) {
  throw new Error("HOME environment variable must be set");
}

export const ConfigDir = path.join(
  process.env.HOME,
  ".config",
  "render-bootleg"
);

function initConfig() {
  if (!fs.existsSync(ConfigDir)) {
    fs.mkdir(
      ConfigDir,
      {
        recursive: true,
      },
      (err) => {
        if (err) throw err;
      }
    );
  }
}

// tokenExists returns true if a token file exists, false otherwise
function validTokenExists() {
  if (!fs.existsSync(path.join(ConfigDir, "token.json"))) {
    return false;
  }
  const { expiresAt } = loadToken();
  if (new Date() > new Date(expiresAt)) {
    return false;
  }
  return true;
}

/**
 * Load a saved token
 * @returns {import('./graphql.js').Login}
 */
function loadToken() {
  return JSON.parse(
    fs.readFileSync(path.join(ConfigDir, "token.json")).toString()
  );
}

// ideas list:
// - ability to use a global flag to format output as json
// - convert to typescript or at least add type annotations
// - allow commands and subcommands to throw, and handle it nicely with an
//   error printed to the console
// - handle logout
// - handle token expiry
// - verbose flag
// - way for user to specify region, some commands are region-specific (ex:
//   logs)
async function main() {
  // parse the command line arguments with minimist:
  // https://github.com/minimistjs/minimist#example
  const argv = minimist(process.argv.slice(2), {
    boolean: ["json"],
    stopEarly: true,
  });

  // if the help flag is present, just print usage and quit
  if (argv.help) {
    return usage();
  }

  initConfig();

  let { idToken, user } = validTokenExists() ? loadToken() : await login();

  const command = argv._[0];
  if (!command) {
    return usage();
  }

  /** @type Record<string, (token:string, user:import('./graphql.js').User, args:string[]) => any> */
  const commands = {
    auth: auth,
    envGroups: envGroups,
    logs: logs,
    projects: projects,
    services: services,
  };

  try {
    if (command in commands) {
      const data = await commands[command](idToken, user, argv._.slice(1));
      display(data, { json: argv.json });
    } else {
      die(`Unable to find command ${command}`);
    }
  } catch (e) {
    if (e instanceof RequestError) {
      die(e.message);
    } else {
      throw e;
    }
  }
}

main();
