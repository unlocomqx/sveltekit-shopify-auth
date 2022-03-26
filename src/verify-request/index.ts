import type { RequestEvent } from "@sveltejs/kit/types/private"
import type { AccessMode, AuthConfig } from "sveltekit-shopify-api"
import { Shopify } from "sveltekit-shopify-api"
import type { Session } from "sveltekit-shopify-api/dist/auth/session/index.js"
import { DEFAULT_ACCESS_MODE } from "../auth/index.js"
import type { Options, Routes } from "./types.js"
import { clearSession, redirectToAuth } from "./utilities.js"
import { verifyToken } from "./verify-token.js"

export function verifyRequest (givenOptions: Options = {}) {
  const { accessMode, returnHeader } = {
    accessMode  : DEFAULT_ACCESS_MODE,
    returnHeader: false,
    ...givenOptions,
  }
  const routes: Routes = {
    authRoute    : "/auth",
    fallbackRoute: "/auth",
    ...givenOptions,
  }

  return async (config: AuthConfig, event: RequestEvent) => {
    const fn = loginAgainIfDifferentShop(routes, accessMode)
    let response = await fn(config, event)
    if (response) {
      return response
    }

    const verifyFn = verifyToken(routes, accessMode, returnHeader)
    return verifyFn(config, event)
  }
}

export function loginAgainIfDifferentShop (
  routes: Routes,
  accessMode: AccessMode = DEFAULT_ACCESS_MODE,
) {
  return async function loginAgainIfDifferentShopMiddleware (
    config: AuthConfig,
    event: RequestEvent,
  ) {
    let session: Session | undefined
    session = await Shopify.Utils.loadCurrentSession(
      config,
      event,
      accessMode === "online",
    )

    const shop = event.url.searchParams.get("shop")
    if (session && shop && session.shop !== shop) {
      await clearSession(config, event, accessMode)
      return redirectToAuth(event, routes)
    }
  }
}
