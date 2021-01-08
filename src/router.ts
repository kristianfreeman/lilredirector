import { Router } from 'tiny-request-router'
import type { Params } from 'tiny-request-router'
import type { Redirect } from './types'

type Handler = (params: Params) => Promise<Response>

const Routes = (redirects: Array<Redirect>): Router<Handler> => {
  const router = new Router<Handler>()
  redirects.forEach(redirect => {
    router.get(redirect.path, async (params: Params) => {
      let redirectPath = redirect.redirect
      Object.keys(params).forEach(key =>
        redirectPath = redirectPath.replace(`:${key}`, params[key])
      )
      return Response.redirect(redirectPath)
    })
  })
  return router
}

export default Routes