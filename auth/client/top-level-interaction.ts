// Copied from https://github.com/Shopify/shopify_app
export const topLevelInteraction = (shop: string, host: string, prefix = "") => {
  return `(function() {
      function setUpTopLevelInteraction() {
        var TopLevelInteraction = new ITPHelper({
          redirectUrl: "${prefix}/auth?shop=${encodeURIComponent(
    shop,
  )}&host=${host}",
        });

        TopLevelInteraction.execute();
      }

      document.addEventListener("DOMContentLoaded", setUpTopLevelInteraction);
    })();`
}
