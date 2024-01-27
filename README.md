# render-bootleg

An unofficial render API that uses their GraphQL API rather than their REST API.

I've created a new tool instead of extending [render-cli](https://github.com/render-oss/render-cli) because:

- Their REST API lacks coverage of all their facilities.
    - it does not cover environment groups or projects, for example
- Their tool seems to be abandoned
- While it's neat that they used deno, my only experience is in node and I don't want to require people to install a new runtime

## Installing

Right now, the best way to install this repository is:

- Clone it to a directory
- Run `npm install`
- Symlink `index.js` to `rb` (short for `render-bootleg`. Give it any name you like)
  - example command: `ln -sf $(pwd)/index.js /usr/local/bin/rb`

This is an annoying way to install software! If people seem interested, I'll develop it into a proper binary.

## Authorizing

The first time you run a command, the program will ask you for your username, password, and TOTP code (one-time password). At that point, it will save the authentication token it receives, which is good for a week.

- This tool hasn't yet existed for a week so I don't yet know how to handle token expiration
- This tool assumes that you use 2fa to log in

## Commands

The commands that this tool supports are in flux, and there are usage notes at the root (`rb --help`) for each subcommand (for example, `rb auth --help`). Use the help text to explore the tool.

## TODO

- handle token expiration
- solidify the interface and document it
- ssh connection
