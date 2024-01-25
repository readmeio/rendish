#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { login, fetchTeams } from "./graphql.js";

import esMain from "es-main";
import minimist from "minimist";

/**
 * Print usage information
 */
function usage() {
  console.log(`Usage: render-bootleg [<options>] [<url>]

render.com CLI

OPTIONS

--help:     display this text
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

async function main() {
  // Check for presence of required environment variables
  ["RENDER_USER", "RENDER_PASS", "RENDER_TOTP"].forEach((envVar) => {
    if (!process.env[envVar])
      throw new Error(`${envVar} environment variable must be set`);
  });

  // parse the command line arguments with minimist:
  // https://github.com/minimistjs/minimist#example
  const argv = minimist(process.argv.slice(2));

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

  console.log(user);

  // for now, just assume that we want the first team. revisit
  const { id: teamID } = await fetchTeams(idToken, user)[0];

  console.log("teamID: ", teamID);
}

if (esMain(import.meta)) {
  await main();
}
