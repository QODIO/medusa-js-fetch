# Medusa JS Client based on Fetch API

[![Version](https://img.shields.io/npm/v/stripe.svg)](https://www.npmjs.org/package/@kodio.io/medusa-js-fetch)

The Medusa JS Client provides easy access to the Medusa API from a client written in Typescript.

## Why replace Axios with `fetch`?

On Next.js projects, the official Axios based client does not work on middleware functions, or anything running on the Edge runtime.
Using fetch allows you to use the client on the Edge.

## Documentation

In most cases, this client should be a drop-in replacement for the Axios based one. Beware that this client is not considered stable, and you may experience some issues.

To learn more about the API endpoints that this client allows you to access check out the [docs for the official JS Client](https://docs.medusajs.com/api/store).

## Known Issues
This client does currently not support retries.
