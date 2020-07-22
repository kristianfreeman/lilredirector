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

const updateRedirect = async ({ path, redirect }) => {
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
    if (redirect.startsWith('/')) {
      let newUrl = new URL(url)
      newUrl.pathname = redirect
      return newUrl
    } else {
      return redirect
    }
  }
}

const renderHtml = page =>
  new Response(page(), {
    headers: { 'Content-type': 'text/html' },
  })

export default async event => {
  let error, response
  const url = new URL(event.request.url)
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
        const redirectObj = {
          path: url.searchParams.get('path'),
          redirect: url.searchParams.get('redirect'),
        }
        url.search = ''
        const updated = await updateRedirect(redirectObj)
        if (!updated) {
          url.searchParams.set('error', true)
        }

        url.pathname = '/_redirects'
        response = Response.redirect(url)
        break
      default:
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
