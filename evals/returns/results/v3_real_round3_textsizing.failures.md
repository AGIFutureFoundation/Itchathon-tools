# Failure report for v3

Summary: {"version": "v3", "model": "sonnet", "n": 9, "cause_accuracy": 0.333, "parsed_rate": 0.889, "grounded_rate": 0.556, "low_data_ok_rate": 0.0, "fix_rate": 0.889, "owner_line_rate": 0.889, "mean_latency_s": 60.7, "hard_subset_accuracy": 0.333, "cases_needing_parse_retry": 0, "cases_unparsed_after_retries": 0, "gate_met": false}

## Confusion (expected -> got: count)
{
 "garment": {
  "expectation": 3,
  "fulfilment": 1,
  "garment": 2
 },
 "size_chart": {
  "None": 1,
  "size_chart": 1,
  "garment": 1
 }
}

## Failed cases
### r31 (shapewear) — cause expected garment got expectation; evidence not verbatim in inputs
- returns: [{"reason_code": "quality", "size_ordered": "X-Large-XX-Large", "comment": "I am so glad I decided to go the old fashion way I have bought other items from shapeellx ,bras ,panty ..it's basically eat less ,exercise ,the addas they show are false ..what the products do are basically stop you from jiggling but you still have a fupa just not jiggling it took me 2 months with exercise to get what I needed this is t an instant fix but the filters on the video ads are untrue and it pushes in nothing it just stops the jiggling of of the body and some maintain on look I bought pantyhose and it did bet
- size_chart: "\"If you are in between sizes or you prefer a looser fit, please order one size up.\" (from manufacturer_description); no numeric chart image text captured."
- photos_note: Amazon listing scraped via Apify; bullets, description and Amazon 'Product information' returned by the product-details actor. Round-3 probe: this listing states its sizing guidance directly in bullet
- expected must_quote: ['already have a hole it', '2 sizes smaller than listed']
- model evidence: ["No bra support, didn't flatten my belly", "No support in the bra area", "the addas they show are false", "I needed a little more control in the tummy area"]
- model owner_line: Rewrite the bra-support and flattening claims in your bullets today so buyers stop expecting more control than the fabric gives.

### r32 (shapewear) — no JSON parsed; cause expected size_chart got None; evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "I could go on about how it took me 10 min to get into this monstrosity and 20min and a neck injury to get out of it but I\u2019ll save that. I went by measurements. They are SO WRONG. I know shape-wear is supposed to snatch you up, especially the waist, but this was WAY too tight. Haven\u2019t decided if I\u2019ll size up 1 or 2 sizes next or just return the dang thing. Very disappointed. I\u2019m 5\u201911 and haven\u2019t seen 1 review from someone my height with a long torso and Booty so maybe that\u2019s the problem too.", "r
- size_chart: "\"Please size up if you are in between sizes\" text sits directly in the bullets (about_item), next to \"check the size chart for your bust, waist and hip size before purchase.\""
- photos_note: Amazon listing scraped via Apify; bullets, description and Amazon 'Product information' returned by the product-details actor. Round-3 probe: this listing states its sizing guidance directly in bullet
- expected must_quote: ['I went by measurements. They are SO WRONG', 'Amazon suggested I get a Large, I got an X-Large just in case']
- model evidence: null
- model owner_line: None

### r33 (bras) — cause expected garment got fulfilment
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "It tends to dig in and makes nursing uncomfortable. I had to remove tge underwire and ot still digs in.", "rating": 3, "review_title": "It digs in."}, {"reason_code": "other", "size_ordered": null, "comment": "I\u2019m not sure there is a point to this review since it appears that this seller has no more of this item to sell but maybe it will help me process! Lol The construction seems good and the sizing is accurate but I agree with most everything else said... strangely tall cups! And too much separation! Also, and here is why I a
- size_chart: "Bullets state in text: \"Measure bust (cup) and under bust (band)- check size chart. If between sizes, round up to the next even number.\""
- photos_note: Amazon listing scraped via Apify; bullets, description and Amazon 'Product information' returned by the product-details actor. Round-3 probe: this listing states its sizing guidance directly in bullet
- expected must_quote: ['the pointy part is too high up', 'The cups were pointy and they gaped at the sides']
- model evidence: ["had NO TAG and was slightly USED", "IT HAD MILK-LEAK SPOTS"]
- model owner_line: Check remaining stock for missing tags or wear before shipping, and message the affected buyer today through Amazon to send a clean replacement.

### r35 (bras) — evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "I ordered this item in a 4x. I am usually a 2x to a 3x but since I will be breast feeding soon I figured I should order a size bigger. I am currently wearing a 2x sports bra, and this 4x sports bra is SMALLER than my 2x. It is not true to size at all. I would say it is at LEAST two sizes too small, if not more.", "rating": 1, "review_title": "Disappointed"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "The Bra itself is beautiful however if you have boobs this is not the one you want. I was looking for a bra fo
- size_chart: "Bullets state in text: \"Measure bust (cup) and under bust (band)- check size chart. If between sizes, round up to the next even number.\""
- photos_note: Amazon listing scraped via Apify; bullets, description and Amazon 'Product information' returned by the product-details actor. Round-3 probe: this listing states its sizing guidance directly in bullet
- expected must_quote: ['I ordered the 3x based on the size chart', 'did not fit based on size chart. It runs small']
- model evidence: ["ordered the 3x based on the size chart", "did not fit based on size chart", "I am a 38H and ordered a 3x. Should have ordered 4x", "the manufacturers lied on the sizing"]
- model owner_line: Recheck and correct the size chart today—multiple buyers followed it exactly and still got a too-small bra.

### r36 (shapewear) — cause expected garment got expectation; evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "6X-Large", "comment": "Was WAY TOO SMALL", "rating": 1, "review_title": "Runs extremely small"}, {"reason_code": "other", "size_ordered": "Large", "comment": "No esta tan mal se ajusta bien", "rating": 3, "review_title": "Soporte medio"}, {"reason_code": "doesnt_fit", "size_ordered": "5X-Large", "comment": "sizes in the description are not accurate even in plus size. If you order your size and the next size or 2 you will be sending it back", "rating": 1, "review_title": "even when you use the chert size not right"}, {"reason_code": "quality", "si
- size_chart: "Description text gives a full inline measurement table (\"Size S: Waist: 24.8-26.8\\\" Length 26.2-28\\\"...\") plus \"Please size up for added comfort\" advice, not an image."
- photos_note: Amazon listing scraped via Apify; bullets, description and Amazon 'Product information' returned by the product-details actor. Round-3 probe: this listing states its sizing guidance directly in bullet
- expected must_quote: ['the zipper broke off so easily', 'the wire in the right side is already coming out of the fabric']
- model evidence: ["didn't do much for sculpting/shaping", "It's a far fetch from a waist trainer", "get about 3-4 inch waist line reduction instantly", "no protective zipper lining"]
- model owner_line: Remove the instant-inch-loss and sculpting claims from your listing text since two reviewers say the trainer doesn't deliver on that promise.

### r37 (bras) — cause expected size_chart got garment
- returns: [{"reason_code": "other", "size_ordered": "Large", "comment": "They do not keep everything in place. They kinda did at first, but it\u2019s like they get stretched out or something and don\u2019t over time.", "rating": 3, "review_title": "Good for a smaller bust"}, {"reason_code": "doesnt_fit", "size_ordered": "Large", "comment": "The band is way too tight and the rest of it is loose. I wore them several times as nursing bras and ended up with mastitis. I know a bra can\u2019t cause that on its own but these are very uncomfortable and poorly proportioned. I even went up a size from my usual.",
- size_chart: "Description opens with an explicit text table: \"SIZE CHART: M fit for 34B 34C 34D / L fit for 36B 36C 36D / XL fit for 38B 38C 38D 40B 40C / XXL fit for 40D 42B 42C 44B 44C\" -- fully written out, no image needed."
- photos_note: Amazon listing scraped via Apify; bullets, description and Amazon 'Product information' returned by the product-details actor. Round-3 probe: this listing states its sizing guidance directly in bullet
- expected must_quote: ['Not true to size. These are SO small. Definitely size up!', 'I even went up a size from my usual']
- model evidence: ["Definitely size up a size or two", "Not true to size. These are SO small", "Buy a size bigger", "band is way too tight and the rest of it is loose"]
- model owner_line: Ask your supplier to fix the tight band and loose cup pattern, and report the health complaint through Amazon messaging only.

### r38 (shapewear) — cause expected garment got expectation
- returns: [{"reason_code": "other", "size_ordered": "Small-Medium", "comment": "Se levanta en la parte de los gl\u00fateos y la parte de abajo es inc\u00f3moda", "rating": 1, "review_title": "No me gust\u00f3"}, {"reason_code": "doesnt_fit", "size_ordered": "Large-X-Large", "comment": "Didn\u2019t do anything to shape my body whatsoever completely disappointed in this product. The thong part was really long and uncomfortable.", "rating": 2, "review_title": "Didn\u2019t shape much"}, {"reason_code": "doesnt_fit", "size_ordered": "Large-X-Large", "comment": "This shaper is great quality, made of a thick f
- size_chart: "about_item opens with: \"Sizing Guidance: Check our size chart and measure your bust, waist, and hips. At first glance, this bodysuit might seem small, but it's made from incredibly stretchy fabric...\""
- photos_note: Amazon listing scraped via Apify; bullets, description and Amazon 'Product information' returned by the product-details actor. Round-3 probe: this listing states its sizing guidance directly in bullet
- expected must_quote: ["I sized way up for starters, got a 4XL when I'm usually an XL", 'leaving all the love handle/hip area uncovered and bulging out']
- model evidence: ["do anything to shape my body whatsoever", "fabric is thick and sturdy enough to do any proper cinching", "no da la forma esperada"]
- model owner_line: Rewrite the tummy-control bullet to promise light smoothing, not dramatic cinching, since several buyers say it didn't shape as claimed.
