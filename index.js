#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { login, RequestError } from "./graphql.js";
import { projects } from "./subcommands/projects.js";
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

projects    list available projects
`);
}

const configDir = path.join(process.env.HOME, ".config", "render-bootleg");

function initConfig() {
  if (!fs.existsSync(configDir)) {
    fs.mkdir(configDir, {
      recursive: true,
    });
  }
}

// tokenExists returns true if a token file exists, false otherwise
function validTokenExists() {
  if (!fs.existsSync(path.join(configDir, "token.json"))) {
    return false;
  }
  const { expiresAt } = loadToken();
  if (new Date() > new Date(expiresAt)) {
    return false;
  }
  return true;
}

function loadToken() {
  return JSON.parse(fs.readFileSync(path.join(configDir, "token.json")));
}

function saveToken(idToken, expiresAt, user) {
  fs.writeFileSync(
    path.join(configDir, "token.json"),
    JSON.stringify({
      idToken,
      expiresAt,
      user,
    })
  );
}

// ideas list:
// - ability to use a global flag to format output as json
// - convert to typescript or at least add type annotations
// - allow commands and subcommands to throw, and handle it nicely with an
//   error printed to the console
async function main() {
  // Check for presence of required environment variables
  ["RENDER_USER", "RENDER_PASS", "RENDER_TOTP"].forEach((envVar) => {
    if (!process.env[envVar])
      throw new Error(`${envVar} environment variable must be set`);
  });

  // parse the command line arguments with minimist:
  // https://github.com/minimistjs/minimist#example
  const argv = minimist(process.argv.slice(2), { stopEarly: true });

  // if the help flag is present, just print usage and quit
  if (argv.help) {
    return usage();
  }

  initConfig();

  let { idToken, expiresAt, user } = validTokenExists()
    ? await loadToken()
    : await login(
        process.env["RENDER_USER"],
        process.env["RENDER_PASS"],
        process.env["RENDER_TOTP"]
      );

  saveToken(idToken, expiresAt, user);

  const command = argv._[0];

  const commands = {
    projects: projects,
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
