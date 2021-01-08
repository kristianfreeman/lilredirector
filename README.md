![banner](./.github/banner.png)

A simple (but powerful!) redirect tool built with Cloudflare Workers. Deploy and manage redirects at the edge without needing to config your origin application.

![demo](./.github/demo.png)

## Installation

This project requires the usage of Cloudflare Workers on your custom domain/zone. Check out my Egghead video on [deploying to a custom domain](https://next.egghead.io/lessons/cloudflare-deploy-to-a-custom-domain-with-cloudflare-wrangler-environments) if you need to set that up.

With a configured Workers project, using Wrangler:

1. Install the package

```bash
$ npm install lilredirector
```

2. Create a `redirects.js` file in your source code:

```javascript
export default [
  {
    path: "/twitter",
    redirect: "https://twitter.com/signalnerve",
  },
  {
    path: "/yt",
    redirect: "https://www.youtube.com/c/bytesizedxyz",
  },
]
```

## Usage

```javascript
import redirector from 'lilredirector'
import redirects from './redirects'

addEventListener('fetch', event => event.respondWith(handler(event)))

// Note the `event` function argument. 
// Unlike many Workers scripts, which pass in `event.request`, 
// lilredirector needs the full `event` object
async function handler(event) {
  const { response, error } = await redirector(event, redirects)
  if (response) return response

  // Optionally, return an error response
  if (error) return error

  // Other workers code
}
```

### Path parameters

Lilredirector includes support for more complex redirect scenarios using _path parameters_. This allows you to capture parameters in the URL and use it to route to new URLs. In `redirects.js`:

```javascript
export default [
  {
    path: "/post/:id",
    redirect: "/posts/:id"
  },
  {
    path: "/users/:id/posts/:post_id",
    redirect: "/u/:id/p/:post_id"
  },
]
```

## Configuration

```javascript
import redirector from 'lilredirector'

addEventListener('fetch', event => event.respondWith(handler(event)))

async function handler(event) {
  const { response, error } = await redirector(event, redirects, {
    // Configuration options can be passed as an optional object.
    // See the below documentation for examples of each:
    //
    // baseUrl
    // basicAuthentication
    // removeTrailingSlashes
  })
  // ...
}
```

### Changing the base URL

By default, lilredirector serves a read-only UI from `/_redirects`. This can be customized by providing `baseUrl` in lilredirector's configuration:

```javascript
async function handler(event) {
  const { response, error } = await redirector(event, redirects,{
    baseUrl: `/mylilredirector`,
  })
  if (response) return response
}
```

### Removing trailing slashes

By default, lilredirector will match and redirect URLs _without_ trailing slashes. For instance, if you have a redirect set up for `/about`, visiting `/about/` will match a redirect for `/about`, and redirect accordingly. This feature can be disabled by passing the `removeTrailingSlashes` boolean in the configuration object into the `redirector` function:

```javascript
async function handler(event) {
  const { response, error } = await redirector(event, redirects, {
    removeTrailingSlashes: false,
  })
  if (response) return response
}
```

## How it works

#### Handlers

Lilredirector embeds itself under the `/_redirects` path, unless specified otherwise by the `baseUrl` configuration param as defined in the previous section. 

## Authentication

You can put the read-only UI behind authentication using a few methods.

### Basic authentication

Using the configuration object, you can enable basic auth for lilredirector and any subpaths (creating/deleting redirects):

```js
async function handler(event) {
  const { response, error } = await redirector(event, redirects, {
    basicAuthentication: {
      username: USERNAME,
      password: PASSWORD,
    },
  })
  if (response) return response
}
```

It's strongly recommended that you use `wrangler secret` to define and store your basic auth credentials, as seen above:

```bash
$ wrangler secret put USERNAME
$ wrangler secret put PASSWORD
```

### Cloudflare Access

You can add complex role-based auth using [cloudflare access](https://teams.cloudflare.com/access/). see the below screenshot for an example config:

![access setup](./.github/access-preview.png)
