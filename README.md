# Colour search module

Two searchable glass catalogues that share one script, one stylesheet and one
data file each. Built to drop into a static site (GitHub Pages serves all of
this as-is, no build step and no server).

## Files

```
colors/
  color-search.js        shared logic, both modes
  color-search.css       shared styles, scoped under .cs-root
  kiln-colors.json       654 colours  (347 KB)
  hotshop-colors.json    577 colours  (184 KB)
  kiln-colors.html       standalone page
  hotshop-colors.html    standalone page
```

## Putting it in an existing page

```html
<link rel="stylesheet" href="/colors/color-search.css">

<div id="kiln-search"></div>

<script src="/colors/color-search.js"></script>
<script>
  ColorSearch.mount('#kiln-search', {
    data: '/colors/kiln-colors.json',
    mode: 'kiln'            // or 'hotshop'
  });
</script>
```

`mount` takes a selector or an element. Paths are relative to the page, so use
site-absolute paths (`/colors/...`) if the pages live at different depths.

Both catalogues can sit on one page: mount twice into two different elements.

## The two modes

| | kiln | hotshop |
|---|---|---|
| makers | Bullseye, Wissmach, Oceanside, Reichenbach, Gaffer | Kugler, Reichenbach, Gaffer, Oceanside |
| filter rows | Glass, Opacity, Contains, Color, Form | Glass, Working, Opacity, Color, Form, Lead |
| detail extras | order codes, reaction notes, non-fusible warning | German name, strike/reduce, forms, price |

## Fonts

The pages load Jost from Google Fonts. If the rest of the site already sets a
typeface, delete those two `<link>` tags and the module inherits whatever the
page uses; only `--cs-*` colours are set locally.

## Fetch, not embed

The data is fetched at runtime rather than baked into the HTML, so both pages
and any other page on the site read the same JSON. Update a colour once and it
changes everywhere.

One consequence: opening the HTML straight off disk (`file://`) will fail the
fetch. It works served over http, including `python3 -m http.server` locally and
GitHub Pages in production.

## Updating the data

Both JSON files are plain and hand-editable. Each colour looks like:

```json
{
  "brand": "Bullseye", "coe": 90, "code": "000116",
  "name": "turquoise blue", "category": "opalescent", "hue": "blue",
  "chemistry": "copper", "tested_compatible": true,
  "forms": {"sheet":1,"frit":1,"powder":1,"stringer":1,"rod":1},
  "item_codes": [{"code":"000116-0030","form":"Double-rolled, 3 mm"}],
  "buy_url": "https://shop.bullseyeglass.com/products/...",
  "retailer": "Bullseye Glass Co."
}
```

Fields the UI reads if present and ignores if absent: `german_name`,
`also_known_as`, `strikes`, `reduces`, `leadfree`, `price_per_kg`,
`price_each`, `product_type`, `notes`, `reaction_notes`, `chemistry_note`.

## Known gaps

- Wissmach and Oceanside have no per-form order codes yet; Bullseye has all 1,628.
- Reichenbach and Gaffer hot shop behaviour comes from the retailer's filter,
  not the manufacturer.
- 130 Bullseye colours are unclassified for chemistry because the maker's
  reactive-potential chart does not cover streaky, collage, ring mottle or
  rod-only styles.
