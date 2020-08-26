import auth from 'basic-auth'
import CSV from 'papaparse'
import template from './template'

declare global {
  const REDIRECTS: KVNamespace
}

import type { CSVData } from './types'

const gatherRedirects = async () => {
  let keys: string[] = []
  let listOpts = { prefix: 'redirects:' }
  let { cursor, keys: kvKeys, list_complete } = await REDIRECTS.list(listOpts)
  keys = keys.concat(kvKeys.map(k => k.name))

  while (!list_complete) {
    let kvReq = await REDIRECTS.list(
      Object.assign(listOpts, { cursor: cursor }),
    )
    keys = keys.concat(kvReq.keys.map(k => k.name))
    cursor = kvReq.cursor
    list_complete = kvReq.list_complete
  }

  const redirects = await Promise.all(
    keys.map(async k => {
      const data = await REDIRECTS.get(k)
      if (!data) return {}
      return JSON.parse(data)
    }),
  )
  return redirects
}

const updateRedirect = async ({
  path: unsanitizedPath,
  redirect: unsanitizedRedirect,
}: {
  path: string
  redirect: string
}) => {
  const path = unsanitizedPath.trim()
  const redirect = unsanitizedRedirect.trim()
  try {
    await REDIRECTS.put(
      `redirects:${path}`,
      JSON.stringify({
        path,
        redirect,
        visits: 0,
      }),
    )
    return true
  } catch (err) {
    console.error(err)
    return false
  }
}

const deleteRedirect = async ({ path }: { path: string }) => {
  await REDIRECTS.delete(`redirects:${path}`)
  return true
}

const redirectToUrl = (redirect: string, url: URL): URL => {
  if (redirect.startsWith('/')) {
    let newUrl = new URL(url.toString())
    newUrl.pathname = redirect
    return newUrl
  } else {
    return new URL(redirect)
  }
}

const getRedirect = async (
  url: URL,
  { event }: { event: FetchEvent },
): Promise<URL | null> => {
  const key = `redirects:${url.pathname}`
  const kvData = await REDIRECTS.get(key)
  if (!kvData) return null
  const result = JSON.parse(kvData)
  if (result) {
    event.waitUntil(
      REDIRECTS.put(
        key,
        JSON.stringify(
          Object.assign(result, {
            visits: result.visits + 1,
          }),
        ),
      ),
    )
    const redirect = result.redirect
    return redirectToUrl(redirect, url)
  }
  return null
}

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
  cancelBulkAddOnError: false,
  removeTrailingSlashes: true,
  validateRedirects: true,
}

export default async (event: FetchEvent, options = {}) => {
  const { request } = event
  const config = Object.assign(defaults, options)
  const { basicAuthentication, baseUrl } = config
  let error, response
  let url = new URL(event.request.url)

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
        const redirects = await gatherRedirects()
        response = renderHtml(template({ baseUrl, redirects }))
        break
      case `${baseUrl}/delete`:
        const pathParam = url.searchParams.get('path')
        if (!pathParam) {
          response = new Response(null, { status: 500 })
          break
        }
        await deleteRedirect({
          path: pathParam,
        })
        response = new Response(null, { status: 204 })
        break
      case `${baseUrl}/update`:
        let updateError = false
        const formData = await request.formData()
        const body: { [key: string]: string } = {}
        for (const entry of formData.entries()) {
          const [key, value] = entry
          if (key && value) {
            body[key] = value.toString()
          }
        }
        const { bulk, path, redirect } = body
        let redirectObjs = []
        if (bulk) {
          let errors: string[] = []
          const { data }: { data: CSVData } = CSV.parse(bulk)
          await Promise.all(
            data.map(async ([path, redirect]) => {
              if (!path || !redirect) return
              if (config.validateRedirects) {
                const fetchUrl = redirectToUrl(redirect, url)
                const resp = await fetch(fetchUrl.toString())
                if (resp.status > 399) {
                  if (config.cancelBulkAddOnError) updateError = true
                  errors.push(
                    `Invalid URL provided or request to URL failed, unable to save: ${redirect}`,
                  )
                  return
                }
              }

              if (config.removeTrailingSlashes && path.endsWith('/')) {
                path = path.slice(0, -1)
              }

              if (config.removeTrailingSlashes && redirect.endsWith('/')) {
                redirect = redirect.slice(0, -1)
              }

              redirectObjs.push({
                path,
                redirect,
              })
            }),
          )

          if (errors.length) {
            url.searchParams.set('error', errors.join('<br>'))
          }
        } else {
          if (config.validateRedirects) {
            const resp = await fetch(redirectToUrl(redirect, url).toString())
            if (resp.status > 299) {
              updateError = true
              url.searchParams.set(
                'error',
                `Invalid URL provided or request to URL, unable to save: ${redirect}`,
              )
            }
          }

          if (!updateError) {
            redirectObjs.push({
              path,
              redirect,
            })
          }
        }

        url.searchParams.delete('bulk')
        url.searchParams.delete('path')
        url.searchParams.delete('redirect')

        if (!updateError) {
          const updated = await Promise.all(redirectObjs.map(updateRedirect))
          if (updated.some(u => u === false)) {
            url.searchParams.set(
              'error',
              'Something went wrong while saving your redirects',
            )
          }
        }

        url.pathname = baseUrl
        response = Response.redirect(url.toString())
        break
      default:
        if (config.removeTrailingSlashes) removeTrailingSlashesFromUrl(url)
        const foundRedirect = await getRedirect(url, { event })
        if (foundRedirect) {
          response = Response.redirect(foundRedirect.toString())
        }
        break
    }
  } catch (err) {
    error = new Response(err.toString())
  }

  return { error, response }
}
