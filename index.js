#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { RequestError } from "./graphql.js";
import {
  auth,
  envGroups,
  login,
  projects,
  services,
} from "./subcommands/index.js";
import { die } from "./ui.js";

import esMain from "es-main";
import minimist from "minimist";

function usage() {
  console.log(`Usage: rb [<options>] [<command>] [args]

render.com CLI

OPTIONS

--help:     display this text

COMMANDS

For help with any command, use \`rb <command> --help\`

auth        auth to render
projects    render projects
services    render services
`);
}

export const ConfigDir = path.join(
  process.env.HOME,
  ".config",
  "render-bootleg"
);

function initConfig() {
  if (!fs.existsSync(ConfigDir)) {
    fs.mkdir(ConfigDir, {
      recursive: true,
    });
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
 * @returns {Promise<import('./graphql.js').Login>}
 */
function loadToken() {
  return JSON.parse(fs.readFileSync(path.join(ConfigDir, "token.json")));
}

// ideas list:
// - ability to use a global flag to format output as json
// - convert to typescript or at least add type annotations
// - allow commands and subcommands to throw, and handle it nicely with an
//   error printed to the console
// - handle logout
// - handle token expiry
async function main() {
  // parse the command line arguments with minimist:
  // https://github.com/minimistjs/minimist#example
  const argv = minimist(process.argv.slice(2), { stopEarly: true });

  // if the help flag is present, just print usage and quit
  if (argv.help) {
    return usage();
  }

  initConfig();

  let { idToken, user } = validTokenExists()
    ? await loadToken()
    : await login();

  const command = argv._[0];

  const commands = {
    auth: auth,
    projects: projects,
    services: services,
    envGroups: envGroups,
  };

  try {
    if (command in commands) {
      await commands[command](idToken, user, argv._.slice(1));
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

if (esMain(import.meta)) {
  await main();
}
