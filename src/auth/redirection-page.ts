import { app_brige_script } from "./client/app-bridge-script"

export function redirectionPage ({ origin, redirectTo, apiKey, host }) {
  return `
    <script>${ app_brige_script }</script>
    <script type="text/javascript">
      document.addEventListener('DOMContentLoaded', function() {
        if (window.top === window.self) {
          // If the current window is the 'parent', change the URL by setting location.href
          window.location.href = "${ redirectTo }";
        } else {
          // If the current window is the 'child', change the parent's URL with postMessage
          var AppBridge = window['app-bridge'];
          var createApp = AppBridge.default;
          var Redirect = AppBridge.actions.Redirect;
          var app = createApp({
            apiKey: "${ apiKey }",
            host: "${ host }",
            shopOrigin: "${ encodeURI(origin) }",
          });
          var redirect = Redirect.create(app);
          redirect.dispatch(Redirect.Action.REMOTE, "${ redirectTo }");
        }
      });
    </script>
  `
}
