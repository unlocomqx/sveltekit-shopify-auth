import type { RequestEvent } from "@sveltejs/kit/types/private"
import cookie from "cookie"
import querystring from "querystring"
import type { AuthConfig, AuthQuery } from "sveltekit-shopify-api"
import { AccessMode, Shopify } from "sveltekit-shopify-api"
import { createEnableCookies } from "./create-enable-cookies.js"
import createRequestStorageAccess from "./create-request-storage-access.js"
import { Error } from "./errors.js"
import { redirectionPage } from "./redirection-page.js"

const DEFAULT_MYSHOPIFY_DOMAIN = "myshopify.com"
export const DEFAULT_ACCESS_MODE = AccessMode.ONLINE
export const TOP_LEVEL_OAUTH_COOKIE_NAME = "shopifyTopLevelOAuth"
export const TEST_COOKIE_NAME = "shopifyTestCookie"
export const GRANTED_STORAGE_ACCESS_COOKIE_NAME = "shopify.granted_storage_access"

function hasCookieAccess (cookies: Record<string, string>) {
  return Boolean(cookies[TEST_COOKIE_NAME])
}

function grantedStorageAccess (cookies: Record<string, string>) {
  return Boolean(cookies[GRANTED_STORAGE_ACCESS_COOKIE_NAME])
}

function shouldPerformInlineOAuth (cookies: Record<string, string>) {
  return Boolean(cookies[TOP_LEVEL_OAUTH_COOKIE_NAME])
}

export function createTopLevelRedirect (apiKey: string, path: string) {
  return function topLevelRedirect (event: RequestEvent): Response {
    const { searchParams } = event.url
    const shop = searchParams.get("shop")
    const host = searchParams.get("shop")

    const params = { shop }
    const queryString = querystring.stringify(params)
    return new Response(
      redirectionPage({
        origin    : shop,
        redirectTo: `https://${ event.url.host }${ path }?${ queryString }`,
        apiKey,
        host,
      }), {
        headers: {
          "set-cookie": cookie.serialize(TOP_LEVEL_OAUTH_COOKIE_NAME, "1", getCookieOptions(event.request)),
        },
      },
    )
  }
}

export function getCookieOptions (request: Request) {
  const { headers } = request
  const userAgent = headers.get("user-agent")
  const isChrome = userAgent && userAgent.match(/chrome|crios/i)
  let cookieOptions = {}
  if (isChrome) {
    cookieOptions = {
      secure: true,
    }
  }
  return cookieOptions
}

export function createHandler (options: AuthConfig) {
  const config = {
    keys           : [],
    prefix         : "",
    myShopifyDomain: DEFAULT_MYSHOPIFY_DOMAIN,
    accessMode     : DEFAULT_ACCESS_MODE,
    IS_PRIVATE_APP : false,
    ...options,
  }

  const { prefix } = config

  const oAuthStartPath = `${ prefix }/auth`
  const oAuthCallbackPath = `${ oAuthStartPath }/callback`

  const inlineOAuthPath = `${ prefix }/auth/inline`
  const topLevelOAuthRedirect = createTopLevelRedirect(
    config.API_KEY,
    inlineOAuthPath,
  )

  const enableCookiesPath = `${ oAuthStartPath }/enable_cookies`
  const enableCookies = createEnableCookies(config)
  const requestStorageAccess = createRequestStorageAccess(config)

  return async (event: RequestEvent) => {
    const { request, url } = event
    const { searchParams: query } = url

    const cookies = cookie.parse(request.headers.get("cookie") || "")

    if (
      url.pathname === oAuthStartPath &&
      !hasCookieAccess(cookies) &&
      !grantedStorageAccess(cookies)
    ) {
      return requestStorageAccess(event)
    }

    if (
      url.pathname === inlineOAuthPath ||
      (url.pathname === oAuthStartPath && shouldPerformInlineOAuth(cookies))
    ) {
      const shop = query.get("shop")
      if (shop == null) {
        return new Response(null, {
          status    : 400,
          statusText: Error.ShopParamMissing,
        })
      }

      const { location, cookie: authCookie } = await Shopify.Auth.beginAuth(
        // @ts-ignore
        config,
        shop,
        oAuthCallbackPath,
        config.accessMode === "online",
      )

      const topLevelRedirectCookie = cookie.serialize(TOP_LEVEL_OAUTH_COOKIE_NAME, "", getCookieOptions(request))

      return new Response(null, {
        status : 302,
        headers: new Headers([
          ["location", location],
          ["set-cookie", authCookie],
          ["set-cookie", topLevelRedirectCookie],
        ]),
      })
    }

    if (url.pathname === oAuthStartPath) {
      return topLevelOAuthRedirect(event)
    }

    if (url.pathname === oAuthCallbackPath) {
      try {
        const authQuery: AuthQuery = {
          code     : query.get("code") || "",
          shop     : query.get("shop") || "",
          host     : query.get("host") || "",
          state    : query.get("state") || "",
          timestamp: query.get("timestamp") || "",
          hmac     : query.get("hmac") || "",
        }

        if (config.afterAuth) {
          const result = await Shopify.Auth.validateAuthCallback(event, config, authQuery)
          return config.afterAuth(result)
        }
      } catch (e) {
        console.error(e)
        switch (true) {
          case e instanceof Shopify.Errors.InvalidOAuthError:
            return new Response(null, {
              status    : 400,
              statusText: e.message,
            })
            break
          case e instanceof Shopify.Errors.CookieNotFound:
          case e instanceof Shopify.Errors.SessionNotFound:
            // This is likely because the OAuth session cookie expired before the merchant approved the request
            return new Response(null, {
              status : 302,
              headers: {
                location: `${ oAuthStartPath }?shop=${ query.get("shop") }`,
              },
            })
            break
          default:
            return new Response(null, {
              status    : 500,
              statusText: e.message,
            })
            break
        }
      }
      return
    }

    if (url.pathname === enableCookiesPath) {
      return enableCookies(event)
    }

    return undefined
  }
}
