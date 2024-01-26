import fs from "node:fs";
import path from "node:path";

import { signIn, signInTOTP } from "../graphql.js";
import { ConfigDir } from "../index.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";
import promptSync from "prompt-sync";

const prompt = promptSync();

function usage() {
  console.log(`Usage: rb [<options>] [<command>] [args]

${color.yellow("auth")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

login    login and create saved config
`);
}

function saveToken(idToken, expiresAt, user) {
  fs.writeFileSync(
    path.join(ConfigDir, "token.json"),
    JSON.stringify({
      idToken,
      expiresAt,
      user,
    })
  );
}

export async function login() {
  const username = prompt("username: ");
  const password = prompt.hide("password: ");
  const { idToken: signInToken } = await signIn(username, password);

  // we assume that TOTP is required. TODO: support non-TOTP login?
  const totp = prompt("TOTP code: ");
  const { idToken, expiresAt, user } = await signInTOTP(signInToken, totp);

  saveToken(idToken, expiresAt, user);

  return { idToken, expiresAt, user };
}

export async function auth(_, __, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  const subcommands = {
    login: login,
  };

  if (subcommand in subcommands) {
    await subcommands[subcommand](args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
  }
}
