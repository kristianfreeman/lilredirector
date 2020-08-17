import CSV from 'papaparse'
import template from './template'

const gatherRedirects = async () => {
  let keys = []
  let listOpts = { prefix: 'redirects:' }
  let { cursor, keys: kvKeys, list_complete } = await REDIRECTS.list(listOpts)
  keys = [].concat(
    keys,
    kvKeys.map(k => k.name),
  )

  while (!list_complete) {
    let kvReq = await REDIRECTS.list(
      Object.assign(listOpts, { cursor: cursor }),
    )
    keys = [].concat(
      keys,
      kvReq.keys.map(k => k.name),
    )
    cursor = kvReq.cursor
    list_complete = kvReq.list_complete
  }

  const redirects = await Promise.all(
    keys.map(async k => JSON.parse(await REDIRECTS.get(k))),
  )
  return redirects
}

const updateRedirect = async ({
  path: unsanitizedPath,
  redirect: unsanitizedRedirect,
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

const deleteRedirect = async ({ path }) => {
  await REDIRECTS.delete(`redirects:${path}`)
  return true
}

const redirectToUrl = (redirect, url) => {
  if (redirect.startsWith('/')) {
    let newUrl = new URL(url)
    newUrl.pathname = redirect
    return newUrl
  } else {
    return redirect
  }
}

const getRedirect = async (url, { event }) => {
  const key = `redirects:${url.pathname}`
  const result = JSON.parse(await REDIRECTS.get(key))
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
}

const renderHtml = page =>
  new Response(page(), {
    headers: { 'Content-type': 'text/html' },
  })

const removeTrailingSlashesFromUrl = url =>
  (url.pathname = url.pathname.slice(0, -1))

const defaults = {
  cancelBulkAddOnError: false,
  removeTrailingSlashes: true,
  validateRedirects: true,
}

const parseBulk = bulk => {
  const string = decodeURIComponent(bulk)
  return CSV.parse(string)
}

export default async (event, options = {}) => {
  const config = Object.assign(defaults, options)
  let error, response
  let url = new URL(event.request.url)
  try {
    switch (url.pathname) {
      case '/_redirects':
        const redirects = await gatherRedirects()
        response = renderHtml(template({ redirects }))
        break
      case '/_redirects/delete':
        await deleteRedirect({
          path: url.searchParams.get('path'),
        })
        response = new Response(null, { status: 204 })
        break
      case '/_redirects/update':
        let updateError = false

        const bulk = url.searchParams.get('bulk')
        let redirectObjs = []
        if (bulk) {
          let errors = []
          const { data } = parseBulk(bulk)
          await Promise.all(
            data.map(async ([path, redirect]) => {
              if (!path || redirect) return
              if (config.validateRedirects) {
                const fetchUrl = redirectToUrl(redirect, url)
                const resp = await fetch(fetchUrl)
                if (resp.status > 399) {
                  if (config.cancelBulkAddOnError) updateError = true
                  errors.push(
                    `Invalid URL provided or request to URL failed, unable to save: ${redirect}`,
                  )
                  return
                }
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
            const redirect = url.searchParams.get('redirect')
            const resp = await fetch(redirectToUrl(redirect, url))
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
              path: url.searchParams.get('path'),
              redirect: url.searchParams.get('redirect'),
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

        url.pathname = '/_redirects'
        response = Response.redirect(url)
        break
      default:
        if (config.removeTrailingSlashes) removeTrailingSlashesFromUrl(url)
        const redirect = await getRedirect(url, { event })
        if (redirect) {
          response = Response.redirect(redirect)
        }
        break
    }
  } catch (err) {
    error = new Response(err.toString())
  }

  return { error, response }
}
