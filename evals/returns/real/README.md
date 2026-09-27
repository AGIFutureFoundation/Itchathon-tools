# Real Amazon reviews (Apify) — source data for `evals/returns/cases_real.jsonl`

Fetched 2026-09-27 via the Apify REST API (`POST /v2/acts/junglee~amazon-reviews-scraper/run-sync-get-dataset-items`).

- **Actor:** `junglee/amazon-reviews-scraper` (pay-per-event, $0.006/review on the FREE tier).
- **Account tier:** FREE. The actor caps free accounts at **1 start URL and 10 reviews per run**
  (logged as a warning); requesting more makes the run page past 10 and time out. Two initial
  multi-URL runs (`maxReviews: 40`) hit this: one returned 10 reviews for the first URL only, the
  other timed out at 240 s with 10 reviews saved. All later runs were 1 ASIN, `maxReviews: 10`.
- **Input used:** `filterByRatings: ["critical"]` (Amazon's 1–3 star filter), `sort: "helpful"`,
  `scrapeProductDetails: true`, `includeGdprSensitive: false`.
- **ASIN discovery:** `apify/google-search-scraper`, 5 `site:amazon.com …` queries ($0.02).
- **Cost:** 10 reviews-actor runs ≈ $0.40 (two timed-out runs still billed $0.06 each) + $0.02 SERP ≈ **$0.42** total.
- **Caveat:** on the free tier the product-details pass returned no bullet points / size chart for any
  product (`features: []`), so listings in the cases have only title, description (where Amazon shows one),
  and a factual `photos_note`. `size_chart` is `null` everywhere.

## Products

| Requested ASIN | Resolved ASIN | Product | Critical reviews | Used in |
|---|---|---|---|---|
| B0DKXRQR1J | B0DKXV4QGM | CHICME Womens Cocktail Dresses Pearls Strap Bodycon Midi Dress | 10 | r01, r02 |
| B0CDX9Y6VP | B0CDX8T2T4 | MIHOLL Womens 2024 Sweater Dress Long Sleeve V Neck Twist Front Slim Fit Ribbed Knit Bodycon Midi Dress | 10 | r03, r04 |
| B0FG2MLMZZ | B0FG2MFHB9 | NORTIV 8 Men's Trail Running Shoes Wide Toe Box | 10 | r05, r06 |
| B0DJXRHWJH | B0DJXRHWJH | Blisset High Waist Leggings for Women - Opaque, Soft Tummy Control … | 10 | r07 |
| B0BZMM8CT4 | B0BZMM8CT4 | ZKXYFFS Platform Ankle Boots for Women Chunky High Heel Booties … | 3 | r10 |
| B0HH97MP14 | B0FJCNG2JZ | Sweater Dress Long Sleeve Casual Fall Winter Bodycon Dresses for Women 2026 (Grace's Secret) | 10 | r08, r09 |
| B0CPSJ8FB4 | B0C5JS8443 | Women's High Waisted Flared Leggings Cut Out Stretchy Ladder Bootcut Yoga Pants | 1 | — (too few) |
| B0DFMD72VP | B0DFMCLSF8 | Women Sweater Bodycon Dress Fall Casual Mock Neck … | 0 | — (category stub only) |
| B0DFW874YX | B0DFW7617S | Sweater Dress for Women Fall Winter Knit V Neck Collared … | 0 | — (category stub only) |
| B0DSZSTZ5Y | — | Wide Toe Box Shoes for Men | run TIMED-OUT | — |

Total: **54 critical reviews** across 7 products; 44 used as return rows in r01–r10.

## Files

- `raw_<requested_asin>.json` — exact dataset items returned by the actor (each item = one review, with the
  scraped `product` object attached). Items with no `reviewDescription` are the actor's "category data" stubs.
- `../cases_real.jsonl` — 10 cases (r01–r10). `returns[].comment` is the review body **verbatim**;
  `reason_code` was mapped by hand from the review content; `size_ordered` comes from the review's variant
  attribute. `reviews[]` holds leftover reviews of the same product (`"<title>: <body>"`). Each row also
  keeps `rating` and `review_title` for reference. `expected.cause` was labelled by reading the reviews
  (majority signal); every `must_quote` was verified programmatically to appear verbatim in the case inputs.

Label distribution r01–r10: garment 3, expectation 3, not_enough_data 2, size_chart 1, fulfilment 1, photos 0.


---

# Round 2 (r11–r30) — listings with bullets, fetched 2026-09-27

Goal: 20 more real cases that are fairer to the product — every listing now carries its bullet points and Amazon's
"Product information" fit/fabric facts, so a missing chart or bullet is no longer a scraper gap the model can mistake
for a listing defect.

## Actors tried for product details

| Actor | Result | Cost |
|---|---|---|
| `junglee/Amazon-crawler` (product mode, $0.005/result) | `features: []` for every product, even Levi's 501 — same empty bullets as the round-1 reviews actor's product pass. Not usable for bullets. | 2 runs, $0.01 |
| `apify/website-content-crawler` (1 URL, playwright then cheerio, residential proxy) | Amazon served the "Click the button below to continue shopping" bot page / timed out; 0 pages of content. | 2 runs, $0.09 |
| `logical_scrapers/amazon-product-scraper` ($0.002/item) | Works: `features[]` (bullets), `description`, `info_table`. Kept as backup only. | 1 run, $0.002 |
| **`delicious_zebu/amazon-product-details-scraper`** ($0.0025/item + $0.00005/start) | **Used.** Returns `about_item` (bullets, triple-space separated), `product_description`, `manufacturer_description` (A+ text), `product_information` (Fit Type, Fit-to-Size Sentiment, Inseam/Waist for the default variant, fabric, opacity…), `rating_distribution`, `customer_review_aspects`, `top_reviews`, `images`. Accepts a list of ASINs in one run. | 5 runs / 82 items, $0.17 |
| `junglee/amazon-product-details`, `axesso_data/amazon-product-scraper` | Do not exist in the store (404). `axesso_data` only publishes review/offer scrapers. | — |

**Size charts:** on every one of the 20 listings Amazon's size-chart table is an image or a JS popup. No actor returns it
(nor does the raw HTML, which Amazon will not serve to a crawler). `listing.size_chart` therefore holds the listing's own
sizing *text* when it has any (bullet size mappings, "runs small/large" notes, default-variant inseam/waist from Product
information, or the fact that two charts exist) and is `null` otherwise; `photos_note` states this explicitly so the model
does not read `null` as "seller published no chart". Bullets are present for all 20.

## Reviews and ASIN discovery

- Reviews: `junglee/amazon-reviews-scraper`, same input as round 1 (`filterByRatings: ["critical"]`, `sort: "helpful"`,
  `maxReviews: 10`, 1 ASIN per run because of the free-tier cap). 21 runs ≈ $1.18 (10 reviews each; `B000XEUPMY` returned
  nothing and was dropped; `B0CGP4558Y` had only 3 critical reviews and became the small case r30).
- Discovery: `apify/google-search-scraper`, 4 runs / 31 `site:amazon.com …` queries (jeans, chinos, bras, sports bras,
  swimsuits, plus-size tops, hoodies, leggings, rompers, kids/toddler shoes, men's boots) ≈ $0.14. Men's-boot queries never
  returned a rated listing; the men's side is covered by two chino ASINs.
- **Round-2 spend ≈ $1.59** (Apify run usage summed over this session's runs; account month-to-date went $0.46 → $2.05).
  Budget cap was $3.

## Products (r11–r30)

| Case | Requested ASIN | Resolved ASIN | Product | Bullets | size_chart text | Product-information | Critical reviews → returns | Label |
|---|---|---|---|---|---|---|---|---|
| r11 | B0CD1XJTM4 | B0H38CYSJW | GRAPENT Straight Leg Jeans for Women High Waisted Stretchy F | 5 | yes | 9 keys | 10 | fulfilment |
| r12 | B0921PFSFC | B0C8LWNSRX | KUNMI Women High Waist Skinny Stretch Ripped Jeans Destroyed | 5 | yes | 10 keys | 10 | expectation |
| r13 | B0D9241NQQ | B0D925F1Z6 | Gocolloa Womens Plus Size Skinny Jeans High Waisted Stretchy | 5 | yes | 11 keys | 10 | size_chart |
| r14 | B0D8TDJBFF | B0D8TDR3NS | JMIERR Men's Chino Pants Casual Elastic Waist Tapered Golf T | 5 | yes | 11 keys | 10 | garment |
| r15 | B07V9Y6497 | B07V8L2RTY | VICTORIOUS Men's Basic Casual Slim Fit Stretch Chino Pants | 5 | yes | 11 keys | 10 | garment |
| r16 | B0D6RQFKF4 | B085ZSHRR6 | KARALIN Women Plus Size Maxi Dress Short Sleeve Round Neck L | 5 | yes | 11 keys | 10 | garment |
| r17 | B0DNMQD5MF | B0DNMQTQ6J | Women Plaid Long Dress Lantern Sleeve Square Neck Maxi Dress | 5 | no (image only) | 10 keys | 10 | expectation |
| r18 | B0G52Q2261 | B0G52LFG1R | Hanna Nikole Women One Piece Tummy Control Slimming Swimsuit | 5 | no (image only) | 9 keys | 10 | garment |
| r19 | B0DQ4WMPXY | B0DQ4TTVTX | Pink Queen Tankini Swimsuit for Women Scoop Neck Ruched Tumm | 5 | no (image only) | 10 keys | 10 | garment |
| r20 | B0CJ7T6HJX | B0B5QT74P7 | Yvette Adjustable Sports Bras High Impact Zip Front | 5 | yes | 9 keys | 10 | size_chart |
| r21 | B0FM1XM3NZ | B07P5K3Q5S | Match Racerback Sports Bra for Women, Mid-Impact, New Size | 5 | yes | 9 keys | 10 | garment |
| r22 | B0DD6ZBCDQ | B0FGJHYGTZ | Upushall Push Up Padded Bras for Women Add 2 Cup Plunge Tshi | 5 | no (image only) | 9 keys | 10 | not_enough_data |
| r23 | B0H8P6431B | B0H8DB8L4Z | Ubras Seamless Bras for Women Light Support Wireless Bralett | 5 | no (image only) | 6 keys | 10 | expectation |
| r24 | B0H9DHY5HK | B0H7SSCCH5 | TNNZEET High Waisted Leggings for Women - No See Through Tum | 5 | yes | 10 keys | 10 | expectation |
| r25 | B0C65V5FGJ | B0H5QZ1JM9 | Trendy Queen Womens Hoodies Oversized Sweatshirt | 5 | no (image only) | 7 keys | 10 | garment |
| r26 | B098L7SHCM | B0H5W1BLYZ | TIYOMI Plus Size Tops for Curvy Women Long Sleeve Shirts Cre | 5 | no (image only) | 6 keys | 10 | expectation |
| r27 | B08SC42DZB | B091KPKNMH | MANER Women's Plus Size Tops Short Sleeve Flowy Shirts Casua | 5 | no (image only) | 9 keys | 10 | expectation |
| r28 | B0F7M62KJ8 | B0F7M4D79F | Amazon Essentials Unisex Kids and Toddlers' Canvas Slip-on S | 3 | no (image only) | 3 keys | 10 | garment |
| r29 | B0DTP2FWKW | B0DTP8C28F | Fixmatti Women Summer Romper - Self Tie V Neck Casual Jumpsu | 5 | no (image only) | 7 keys | 10 | garment |
| r30 | B0CGP4558Y | B0BHXL4STY | Arctix Kids' Tracer Winter Boot | 5 | no (image only) | 2 keys | 3 | not_enough_data |

Round-1 ASINs (B0DKXRQR1J, B0CDX9Y6VP, B0FG2MLMZZ, B0DJXRHWJH, B0HH97MP14, B0BZMM8CT4) were re-fetched with the details
actor and **all six now have bullets** (925–1939 chars). They were *not* reused for new cases (their 54 reviews are already
in r01–r10); r01–r10 are left byte-for-byte unchanged, so a later pass can back-fill their `listing.bullets` from
`raw_<asin>.details.json` if wanted.

## Case construction

- One case per ASIN. **All** critical reviews become `returns[]` (10 each; 3 for r30) in the actor's helpful-sorted order —
  no cherry-picking — so `reviews[]` is empty. `comment` = review body verbatim; `reason_code` mapped by hand from the text;
  `size_ordered` from the variant's Size attribute (`colour_ordered` when the variant is a colour); `rating` and
  `review_title` kept.
- `listing` = title, `bullets[]`, `description` (product_description), `manufacturer_text` (A+ copy, trimmed before the
  comparison-table noise), `details` (Product-information fit/fabric keys), `size_chart` (see above), `photos_note`.
- Extra reference fields: `label_rationale` (one line), `resolved_asin`, `rating_summary`, `source`, `real: true`.
- **Labelling policy** (`expected.cause`): each return tagged with the v3 prompt's tags (SHIP/LOOK/CLAIM/CHART/FIT/BUILD/NOISE);
  the cause is the tag with the most returns; FIT only counts as a cluster when it runs in one direction, and a consistent
  FIT cluster becomes `size_chart` when ≥2 buyers say they followed the chart/measurements, otherwise `garment`; ties are
  broken in ladder order (fulfilment > photos > expectation > size_chart > garment); opposite-direction fit with no chart
  talk, or nothing reaching 2 returns, → `not_enough_data`. Where raw plurality and the ladder disagree the rationale says so.
- Every `must_quote` was verified programmatically as an exact substring of the JSON of `listing/returns/reviews/messages`
  (the same blob `evals/run.py` uses for grounding). Two quotes had to follow reviewer typos ("the roll up nonstop").

Label distribution r11–r30: garment 9, expectation 6, size_chart 2,
not_enough_data 2, fulfilment 1, photos 0.
Cumulative r01–r30: garment 12, expectation 9, size_chart 3, not_enough_data 4, fulfilment 2, photos 0.

## Files (round 2)

- `raw_<asin>.json` — reviews-actor items (one per review, product object attached), as in round 1.
- `raw_<asin>.details.json` — the product-details actor's item for that ASIN (bullets, descriptions, product information,
  rating distribution, review aspects, top reviews, image URLs).
