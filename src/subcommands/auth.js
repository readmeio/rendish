import fs from "node:fs";
import path from "node:path";

import { signIn, signInTOTP } from "../graphql.js";
import { ConfigDir } from "../index.js";
import { die } from "../ui.js";

import color from "colors-cli/safe";
import minimist from "minimist";
import promptSync from "prompt-sync";

function usage() {
  console.log(`Usage: rendish [<options>] [<command>] [args]

${color.yellow("auth")} subcommand

OPTIONS

--help:     display this text

SUBCOMMANDS

show     show saved login information
`);
}

/**
 * @param {string} idToken
 * @param {string} expiresAt
 * @param {import('../graphql.js').User} user
 */
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
  const prompt = promptSync();

  // TODO: can we log people in via oauth?
  console.log(
    "If you normally log in to render via oauth, you will need to go into account settings and add a password to your account\n"
  );
  const username = prompt("username: ");
  const password = prompt.hide("password: ");
  const { idToken: signInToken } = await signIn(username, password);

  // we assume that TOTP is required. TODO: support non-TOTP login?
  const totp = prompt("TOTP code: ");
  const { idToken, expiresAt, user } = await signInTOTP(signInToken, totp);

  saveToken(idToken, expiresAt, user);

  return { idToken, expiresAt, user };
}

function show() {
  return {
    type: "json",
    data: String(fs.readFileSync(path.join(ConfigDir, "token.json"))),
  };
}

/**
 * @param {any} _
 * @param {any} __
 * @param {string[]} args
 */
export function auth(_, __, args) {
  const argv = minimist(args);

  if (argv.help || !argv._.length) {
    return usage();
  }

  const subcommand = argv._[0];

  /** @type Record<string, (args:string[]) => any> */
  const subcommands = {
    show: show,
  };

  if (subcommand in subcommands) {
    return subcommands[subcommand](args.slice(1));
  } else {
    die(`Unable to find subcommand ${subcommand}`);
  }
}
