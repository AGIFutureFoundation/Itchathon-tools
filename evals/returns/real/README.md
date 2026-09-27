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
