import type { RequestEvent } from "@sveltejs/kit/types/private"
import type { AccessMode, AuthConfig } from "sveltekit-shopify-api"
import { Shopify } from "sveltekit-shopify-api"
import { DEFAULT_ACCESS_MODE } from "../auth"

import type { Routes } from "./types"

export function redirectToAuth (
  event: RequestEvent,
  { fallbackRoute, authRoute }: Routes,
) {
  const shop = event.url.searchParams.get("shop")

  const routeForRedirect =
    shop == null ? fallbackRoute : `${ authRoute }?shop=${ shop }`

  return new Response(null, {
    status : 301,
    headers: {
      location: routeForRedirect,
    },
  })
}

export async function clearSession (
  config: AuthConfig,
  event: RequestEvent,
  accessMode: AccessMode = DEFAULT_ACCESS_MODE,
) {
  try {
    await Shopify.Utils.deleteCurrentSession(
      config,
      event,
      accessMode === "online",
    )
  } catch (error) {
    if (error instanceof Shopify.Errors.SessionNotFound) {
      // We can just move on if no sessions were cleared
    } else {
      throw error
    }
  }
}
