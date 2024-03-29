# rendish

An unofficial render CLI that uses their GraphQL API rather than their REST API.

## Installing

`npm install -g rendish`

## Authorizing

The first time you run a command, the program will ask you for your username, password, and TOTP code (one-time password). At that point, it will save the authentication token it receives, which is good for a week.

If you currently only us an oauth login, you will need to go into the accounts page and create a password, which will allow you to log in with your oauth email as your username

This tool assumes that you use 2fa to log in; enable 2fa if you haven't yet.

## Why

I've created a new tool instead of extending [render-cli](https://github.com/render-oss/render-cli) because:

- Their REST API lacks coverage of all their facilities.
    - it does not cover environment groups or projects, for example
- Their tool seems to be abandoned
- I wanted to use node instead of deno

## Commands

The commands that this tool supports are in flux, and there are usage notes at the root (`rendish --help`) for each subcommand (for example, `rendish services --help`). Use the help text to explore the tool.

## TODO

- handle token expiration better
- solidify the interface and document it
- [this](https://github.com/ottdump/render-action/blob/211a79f048bced8fecf1fe0418036f9be54253cc/src/generated/sdk.ts) appears to be a generated graphQL sdk, I'm not sure what they generated it from? but maybe it's useful
- documentation
