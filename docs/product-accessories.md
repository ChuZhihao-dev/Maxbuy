# Product accessories

The product template includes an **Accessories** block above the purchase buttons.

- Source: the current product's `custom.accessories` metafield.
- Definition type: **Product → List of products** (`list.product_reference`).
- Display order follows the metafield. The block displays two products by default;
  the limit, heading, More Accessories link, mobile text layout,
  and selection animation are configurable in the theme editor.
- Accessories start unchecked; shoppers choose which ones to include.
- Product images, titles, prices, compare-at prices and availability come from
  the referenced products. The first available variant is used; its option name
  is shown in the subtitle when the accessory has variants.
- Subtitle: `custom.short_description`, falling back to the product description.
- Unavailable products and products requiring a selling plan cannot be selected.
- The current product is excluded from its own accessory list.
- Empty metafields hide the block on the storefront. The theme editor shows
  only a configuration prompt; no sample products or images are included.

## Cart behavior

Selected accessories join the main product in a single Add to cart request,
including when using the sticky purchase bar. Accessory quantities scale with
the main quantity, rounded up to the accessory's minimum and quantity increment.
The main item's personalization, file uploads and selling plan stay on its line.
Shopify remains responsible for final inventory and maximum-quantity validation.

Shopify's native accelerated **Buy it now** still purchases the main product.
Use **Add to cart** to purchase the selected accessories together.

## Verification

Run `shopify theme check` for Liquid/schema checks. The repository currently has
unrelated Theme Check findings, so inspect findings for the changed files.

The Figma design uses DIN Next LT Pro for accessory prices. Without that licensed
font in the theme, numeric prices fall back to Arial Narrow/Arial. Other text
uses the theme's Montserrat and the system Helvetica/Arial stack.
