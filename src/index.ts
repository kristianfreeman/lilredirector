import auth from 'basic-auth'
import Router from './router'
import template from './template'

import type { Redirect } from './types'

const renderHtml = (page: () => string) =>
  new Response(page(), {
    headers: { 'Content-type': 'text/html' },
  })

const removeTrailingSlashesFromUrl = (url: URL) => {
  if (url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1)
}

const defaults = {
  basicAuthentication: {
    username: null,
    password: null,
  },
  baseUrl: '/_redirects',
  removeTrailingSlashes: true,
}

export default async (event: FetchEvent, redirects: Array<Redirect>, options = {}) => {
  const { request } = event
  const config = Object.assign(defaults, options)
  const { basicAuthentication, baseUrl } = config
  let error, response
  let url = new URL(event.request.url)

  const router = Router(redirects)

  if (url.pathname.startsWith(config.baseUrl)) {
    if (basicAuthentication.username && basicAuthentication.password) {
      const authHeader = request.headers.get('Authorization')
      if (!authHeader) {
        return {
          error: new Response('Unauthorized', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Basic realm="lilredirector"',
            },
          }),
        }
      }

      const user = auth.parse(authHeader)
      if (!user) return { error: new Response('Unauthorized', { status: 403 }) }
      if (
        user.name !== basicAuthentication.username ||
        user.pass !== basicAuthentication.password
      ) {
        return { error: new Response('Unauthorized', { status: 403 }) }
      }
    }
  }

  try {
    switch (url.pathname) {
      case `${baseUrl}`:
        response = renderHtml(template({ baseUrl, redirects }))
        break
      default:
        if (config.removeTrailingSlashes) removeTrailingSlashesFromUrl(url)
        const match = router.match('GET', url.pathname)
        if (match) response = match.handler(match.params)
        break
    }
  } catch (err) {
    error = new Response(err.toString())
  }

  return { error, response }
}
