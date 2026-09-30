# Reference storefront

The landing page and collection pages follow `Reference/Landing Page/Main.dc.html`
and `Reference/Tshirt page/Main.dc.html`. The original festive photograph and SVG
ornaments are bundled locally. Product photography, names, prices, inventory,
categories and counts come from the existing backend rather than mockup records.

`src/storefront.css` contains responsive storefront styling. Existing account,
checkout, payment, administration and product detail routes remain in place.

## Existing API connections

- Products: `GET /api/products`; category, gender, size, color, brand, material,
  search, price range and supported sort values remain query parameters.
- Filters and fit finder: `GET /api/products/facets` and
  `GET /api/meta-options/public`.
- Bag: existing `addToCart` Redux action and `POST /api/cart`, including the selected
  size, color, SKU and authenticated user or guest identity.
- Wishlist: existing `GET /api/wishlist`, `POST /api/wishlist/add/:id` and
  `DELETE /api/wishlist/remove/:id`.
- Newsletter: `POST /api/subscribe`.
- Offers, collaborations, search history and recommendations retain their existing
  endpoints. Prebooking cards open the existing product prebooking flow.

The fit finder filters by catalog sizes; product pages retain their measurement
charts. Unsupported backend sort values are not sent. Catalog request IDs prevent
older responses from replacing a newer filter selection.

## Validation

- `npm run build` passes (existing large-bundle warning remains).
- Targeted ESLint checks pass for all changed components and the product slice.
- Browser checks cover responsive widths from 320 to 1440 pixels, stock-aware size
  buttons, guest bag payloads, fit finder, grid density, pagination, preserved search
  and sort filters, mobile filter drawer, newsletter and empty/error responses.
- Live catalog rendering checked on the home and collection pages against the local
  backend. The backend permits `http://localhost:5174` for local preview; using an
  arbitrary port or `127.0.0.1` can be rejected by its existing CORS configuration.
