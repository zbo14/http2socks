# http2socks

A Dockerized HTTP proxy that routes traffic through [socksproxy](https://github.com/zbo14/socksproxy).

Intended for clients that don't support SOCKS.

## Install

Make sure you have [Docker](https://docs.docker.com/install/) installed.

Then `git clone` the repo and `sh /path/to/http2socks/install.sh`.

For development/testing, install [Node](https://nodejs.org/en/download/) and [nvm](https://github.com/nvm-sh/nvm#installation-and-update) if you haven't already.

Then `cd` into the project directory, `nvm i`, and `npm i`.

## Usage

### Build

`$ http2socks build`

Build the Docker image for the HTTP proxy.

### Start

`$ HTTP_PORT= SOCKS_PORT= [SOCKS_HOST=] http2socks start`

Start a Docker container running the HTTP proxy.

**Note:** you must [create the Docker network](https://github.com/zbo14/socksproxy#create-network) before starting the container.

The proxy maps to `HTTP_PORT` and communicates with a `socksproxy` instance with hostname `SOCKS_HOST` listening on `SOCKS_PORT`.

`SOCKS_HOST` defaults to "socksproxy", assuming `socksproxy` and `http2socks` are running on the same Docker host.

### Stop

`$ http2socks stop`

Stop/remove the Docker container.

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
