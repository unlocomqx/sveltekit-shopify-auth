import type { RequestEvent } from "@sveltejs/kit/types/private"
import cookie from "cookie"
import type { AccessMode, AuthConfig } from "sveltekit-shopify-api"
import { Shopify } from "sveltekit-shopify-api"
import type { Session } from "sveltekit-shopify-api/dist/auth/session"
import { HttpResponseError } from "sveltekit-shopify-api/dist/error"
import { DEFAULT_ACCESS_MODE } from "../auth"
import { TEST_COOKIE_NAME, TOP_LEVEL_OAUTH_COOKIE_NAME } from "../auth/index"

import type { Routes } from "./types"
import { redirectToAuth } from "./utilities"

export const REAUTH_HEADER = "X-Shopify-API-Request-Failure-Reauthorize"
export const REAUTH_URL_HEADER =
  "X-Shopify-API-Request-Failure-Reauthorize-Url"

export function verifyToken (
  routes: Routes,
  accessMode: AccessMode = DEFAULT_ACCESS_MODE,
  returnHeader = false,
) {
  return async (
    config: AuthConfig,
    event: RequestEvent,
  ) => {
    let session: Session | undefined
    session = await Shopify.Utils.loadCurrentSession(
      config,
      event,
      accessMode === "online",
    )

    if (session) {
      const scopesChanged = config.SCOPES.toString() !== session.scope

      if (
        !scopesChanged &&
        session.accessToken &&
        (!session.expires || session.expires >= new Date())
      ) {
        try {
          // make a request to make sure oauth has succeeded, retry otherwise
          const client = new Shopify.Clients.Rest(
            session.shop,
            session.accessToken,
          )
          await client.get({ path: "shop" })

          const response = new Response()
          response.headers.append("set-cookie", cookie.serialize(TOP_LEVEL_OAUTH_COOKIE_NAME, ""))
          return response
        } catch (e) {
          if (e instanceof HttpResponseError && e.code === 401) {
            // only catch 401 errors
          } else {
            throw e
          }
        }
      }
    }

    let status = 200
    const headers = new Headers()

    headers.append("set-cookie", cookie.serialize(TEST_COOKIE_NAME, "1"))

    if (returnHeader) {
      status = 403
      headers.set(REAUTH_HEADER, "1")

      let shop: string | undefined = undefined
      if (session) {
        shop = session.shop
      } else if (config.IS_EMBEDDED_APP) {
        const authHeader: string | null = event.request.headers.get("authorization")
        const matches = authHeader?.match(/Bearer (.*)/)
        if (matches) {
          const payload = Shopify.Utils.decodeSessionToken(config, matches[1])
          shop = payload.dest.replace("https://", "")
        }
      }

      if (shop) {
        headers.set(REAUTH_URL_HEADER, `${ routes.authRoute }?shop=${ shop }`)
      }
      return new Response(null, {
        status,
        headers,
      })
    } else {
      return redirectToAuth(event, routes)
    }
  }
}
