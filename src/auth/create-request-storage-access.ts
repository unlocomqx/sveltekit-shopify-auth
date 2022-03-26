import type { RequestEvent } from "@sveltejs/kit/types/private"
import fs from "fs"
import path from "path"
import type { AuthConfig } from "sveltekit-shopify-api"
import { fileURLToPath } from "url"

import { itpHelper } from "./client/itp-helper.js"
import { polarisCss } from "./client/polaris-css.js"
import { requestStorageAccess } from "./client/request-storage-access.js"
import { storageAccessHelper } from "./client/storage-access-helper.js"
import { Error } from "./errors.js"

const HEADING = "This app needs access to your browser data"
const BODY = "Your browser is blocking this app from accessing your data. To continue using this app, click Continue, then click Allow if the browser prompts you."
const ACTION = "Continue"

const __filename = fileURLToPath(import.meta.url)
const baseDir = path.dirname(path.dirname(path.dirname(__filename)))
const APP_BRIDGE_SCRIPT = fs.readFileSync(
  path.resolve(path.join(baseDir, `src/auth/client/app-bridge-2.0.12.js`)),
)

export default function createRequestStorageAccess
({
   prefix,
   API_KEY,
 }: AuthConfig) {
  return function requestStorage (event: RequestEvent) {
    const { searchParams } = event.url

    const shop = searchParams.get("shop")
    const host = searchParams.get("host") || ""

    if (shop == null) {
      return new Response(null, {
        status    : 400,
        statusText: Error.ShopParamMissing,
      })
    }

    return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    ${ polarisCss }
  </style>
  <base target="_top">
  <title>Redirecting…</title>

  <script>${ APP_BRIDGE_SCRIPT }</script>
  <script>
    window.apiKey = "${ API_KEY }";
    window.host = "${ host }";
    window.shopOrigin = "https://${ encodeURIComponent(shop) }";
    ${ itpHelper }
    ${ storageAccessHelper }
    ${ requestStorageAccess(shop, host, prefix) }
  </script>
</head>
<body>
  <main id="RequestStorageAccess">
    <div class="Polaris-Page">
      <div class="Polaris-Page__Content">
        <div class="Polaris-Layout">
          <div class="Polaris-Layout__Section">
            <div class="Polaris-Stack Polaris-Stack--vertical">
              <div class="Polaris-Stack__Item">
                <div class="Polaris-Card">
                  <div class="Polaris-Card__Header">
                    <h1 class="Polaris-Heading">${ HEADING }</h1>
                  </div>
                  <div class="Polaris-Card__Section">
                    <p>${ BODY }</p>
                  </div>
                </div>
              </div>
              <div class="Polaris-Stack__Item">
                <div class="Polaris-Stack Polaris-Stack--distributionTrailing">
                  <div class="Polaris-Stack__Item">
                    <button type="button" class="Polaris-Button Polaris-Button--primary" id="TriggerAllowCookiesPrompt">
                      <span class="Polaris-Button__Content"><span>${ ACTION }</span></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</body>
</html>`, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    })
  }
}
