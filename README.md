# http2socks

An HTTP proxy that routes traffic through [socksproxy](https://github.com/zbo14/socksproxy).

Intended for clients that don't support SOCKS.

## Install

Install [nvm](https://github.com/nvm-sh/nvm#installation-and-update) if you haven't already.

Then clone the repo, `cd` into it, `nvm i`, and `npm i`.

## Usage

### Start

**Note:** default values for named parameters are shown.

`HTTP_PORT=17898 SOCKS_HOST="127.0.0.1" SOCKS_PORT=17897 npm start`

### Stop

`npm stop`

### View logs

`npm run log`

## Test

`npm test`

Run the unit tests for the HTTP proxy.

## Lint

`npm lint`

Lint the source and test files.

## Documentation

`npm run doc`

Generate the code documentation and open in browser.

## Contributing

Please do!

If you find a bug, think of an enhancement, or just have a question, feel free to [open an issue](https://github.com/zbo14/http2socks/issues/new). You're also welcome to [create a pull request](https://github.com/zbo14/http2socks/compare/develop...) addressing an issue. You should push your changes to a feature branch and request merge to `develop`.

Make sure linting/tests pass and coverage is 💯 before creating a pull request!
