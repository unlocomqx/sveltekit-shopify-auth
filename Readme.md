# `sveltekit-shopify-auth`

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md) [![npm version](https://badge.fury.io/js/sveltekit-shopify-auth.svg)](https://badge.fury.io/js/%40shopify%2Fkoa-shopify-auth)

A handler to authenticate a [SvelteKit](https://kit.svelte.dev/) application
with [Shopify](https://www.shopify.ca/).

Based entirely on
to [`@shopify/koa-shopify-auth`](https://www.npmjs.com/package/@shopify/koa-shopify-auth)

## Installation

```bash
$ yarn add svelte-shopify-auth
```

## Usage

This package exposes `createHandler` and `verifyRequest` as named exports.

```js
// inside your hook handle function. See https://kit.svelte.dev/docs/hooks#handle
import { createHandler } from "sveltekit-shopify-auth"

const authHandler = createHandler(config)

const authResponse = await authHandler(event)
if (authResponse) {
  return authResponse
}
```

### createHandler

Handles the auth process of shopify. A config object should be passed to this function.

```ts
import { createHandler } from "sveltekit-shopify-auth"

const authHandler = createHandler({
  // if specified, mounts the routes off of the given path
  // eg. /shopify/auth, /shopify/auth/callback
  // defaults to ''
  prefix: '/shopify',
  // set access mode, default is 'online'
  accessMode: 'offline',
  // callback for when auth is completed
  afterAuth (result: AuthValidationResult) {
    const { shop, accessToken, scope } = result.session
    const host = result.host

    console.log('We did it! 🥳', accessToken);

    // Redirect to our app 🎉
    return new Response(null, {
      status : 301,
      headers: {
        location: `/?shop=${ shop }&host=${ host }`,
      },
    })
  },
})
```

### `verifyRequest`

Verifies requests before letting them further in the chain.

```javascript
import { verifyRequest } from "sveltekit-shopify-auth"

const verifyFn = verifyRequest({returnHeader: true})
const response = await verifyFn(config, event)
if (response.status !== 200) {
  return response
}
```

### Example app

This example will enable you to quickly set up the backend for a working development app. Please
read the [Gotchas](#gotchas) session below to make sure you are ready for production use.

```

## Gotchas

### Session

The provided `MemorySessionStorage` class may not be scalable for production use. You can implement
your own strategy by creating a class that implements a few key methods. Learn more
about [how the Shopify Library handles sessions](https://github.com/Shopify/shopify-node-api/blob/main/docs/issues.md#notes-on-session-handling)
.

### Testing locally

By default this app requires that you use a `myshopify.com` host in the `shop` parameter. You can
modify this to test against a local/staging environment via the `myShopifyDomain` option
to `createHandler` (e.g. `myshopify.io`).
