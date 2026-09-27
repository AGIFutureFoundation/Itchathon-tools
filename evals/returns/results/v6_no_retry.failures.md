# Failure report for v6

Summary: {"version": "v6", "model": "sonnet", "n": 60, "cause_accuracy": 0.9, "parsed_rate": 0.983, "grounded_rate": 0.967, "low_data_ok_rate": 0.833, "fix_rate": 0.983, "owner_line_rate": 0.983, "mean_latency_s": 26.5, "hard_subset_accuracy": 0.9, "gate_met": false}

## Confusion (expected -> got: count)
{
 "photos": {
  "photos": 11,
  "expectation": 1
 },
 "size_chart": {
  "size_chart": 12
 },
 "garment": {
  "garment": 8,
  "expectation": 3,
  "fulfilment": 1
 },
 "expectation": {
  "expectation": 10
 },
 "fulfilment": {
  "fulfilment": 8
 },
 "not_enough_data": {
  "not_enough_data": 5,
  "None": 1
 }
}

## Failed cases
### c12 (beauty) — no JSON parsed; cause expected not_enough_data got None; evidence not verbatim in inputs; did not admit not_enough_data
- returns: [{"reason_code": "changed_mind", "size_ordered": null, "comment": "bought too many"}, {"reason_code": "changed_mind", "size_ordered": null, "comment": ""}]
- size_chart: null
- photos_note: Three tubes fanned out on a linen cloth.
- expected must_quote: ['bought too many']
- model evidence: null
- model owner_line: None

### c15 (accessories) — cause expected garment got expectation
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "handle stitching came apart on the second use with like 4 items in it"}, {"reason_code": "quality", "size_ordered": null, "comment": "seam split along the bottom. not 16oz canvas, feels thin"}, {"reason_code": "quality", "size_ordered": null, "comment": "handle ripped off"}, {"reason_code": "quality", "size_ordered": null, "comment": "stitching unravelling within a week"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "'heavy duty' lol, the canvas is thin like a promo tote"}, {"reason_code": "quality", "size_o
- size_chart: null
- photos_note: Tote on a hook, filled with groceries.
- expected must_quote: ['stitching came apart', 'handle ripped off']
- model evidence: ["not 16oz canvas, feels thin", "the canvas is thin like a promo tote", "Not heavy duty"]
- model owner_line: Confirm the actual canvas weight with your supplier and soften the 16oz/heavy duty claim to match what buyers are reporting.

### c19 (accessories) — cause expected photos got expectation
- returns: [{"reason_code": "not_as_described", "size_ordered": null, "comment": "photos look like real leather with deep grain, this is shiny plastic"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "pics are way too flattering, its PU and looks cheap in person"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "the close-ups show leather texture. the strap is smooth vinyl"}, {"reason_code": "changed_mind", "size_ordered": null, "comment": "looked better in the photos"}, {"reason_code": "quality", "size_ordered": null, "comment": "plasticky, nothing like the p
- size_chart: null
- photos_note: Macro shots showing rich grain and stitching, looks like full grain leather.
- expected must_quote: ['this is shiny plastic', 'pics are way too flattering']
- model evidence: ["shiny plastic", "its PU and looks cheap in person", "the strap is smooth vinyl", "photos make it look like a $60 leather strap"]
- model owner_line: Rewrite the listing to say PU/vinyl leather-look now, since three buyers say photos look like real leather but it's plastic.

### c30 (apparel) — evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "M", "comment": "im a mens 10, chart says M. these are tiny, heel sits under my arch. the sock band itself says M = 6-8.5"}, {"reason_code": "doesnt_fit", "size_ordered": "L", "comment": "chart says L is 11-13, packaging says L = 9-11.5. ordered by the listing and they're too small"}, {"reason_code": "doesnt_fit", "size_ordered": "M", "comment": "size guide on the listing doesnt match whats printed on the socks"}, {"reason_code": "doesnt_fit", "size_ordered": "S", "comment": "ordered S for size 7 per chart, fits my kid"}, {"reason_code": "doesnt_f
- size_chart: "S (US men's 5-7) | M (US men's 8-10) | L (US men's 11-13) | XL (US men's 14+)"
- photos_note: Socks flat lay and on feet in boots.
- expected must_quote: ['sock band itself says M = 6-8.5', 'doesnt match whats printed on the socks']
- model evidence: ["chart says M is 8-10, sock label says 6-8.5", "packaging says L = 9-11.5", "chart is off by a size"]
- model owner_line: Fix the size chart today: multiple buyers and the printed sock label disagree with your listed M and L ranges.

### c33 (beauty) — cause expected garment got expectation
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "bristles fall out constantly, found them all over my face"}, {"reason_code": "quality", "size_ordered": null, "comment": "the ferrule on 3 brushes came loose within a week"}, {"reason_code": "quality", "size_ordered": null, "comment": "shedding like crazy"}, {"reason_code": "quality", "size_ordered": null, "comment": "scratchy bristles, not soft"}, {"reason_code": "quality", "size_ordered": null, "comment": "handle snapped on the powder brush"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "'ultra soft' - the
- size_chart: null
- photos_note: Brushes fanned in a rose gold cup.
- expected must_quote: ['bristles fall out constantly', 'shedding like crazy']
- model evidence: ["scratchy bristles, not soft", "these are like a broom", "Bristles are stiff"]
- model owner_line: Soften or remove the 'ultra soft' bristle claim in the listing since buyers report scratchy, stiff bristles on arrival.

### c49 (accessories) — cause expected garment got expectation
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "tarnished in 4 days. turned my neck green"}, {"reason_code": "quality", "size_ordered": null, "comment": "clasp broke first week"}, {"reason_code": "quality", "size_ordered": null, "comment": "plating rubbing off already, 'tarnish resistant' yeah rite"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "looks slighty different from photo but the real problem is it went dark brown after a week"}, {"reason_code": "quality", "size_ordered": null, "comment": "chain snapped"}, {"reason_code": "quality", "size_ordered"
- size_chart: null
- photos_note: Necklace on a neck, on a marble tile.
- expected must_quote: ['tarnished in 4 days', 'clasp broke']
- model evidence: ["tarnished in 4 days", "plating rubbing off already", "gone dull brown after 5 days", "it tarnished in under a week"]
- model owner_line: Remove the tarnish-resistant claim from your listing today since multiple buyers report the plating wearing off within days.

### c60 (beauty) — cause expected garment got fulfilment
- returns: [{"reason_code": "not_as_described", "size_ordered": null, "comment": "arrived half dried out, flakes everywhere by noon. the tube was barely sealed"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "clumpy and dry straight out of the tube. old stock?"}, {"reason_code": "quality", "size_ordered": null, "comment": "formula is dried up, cant even apply it"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "smudges like crazy, flakes off, and the wand shed bristels"}, {"reason_code": "quality", "size_ordered": null, "comment": "dry and crumbly"}, {"reaso
- size_chart: null
- photos_note: Model close-up of lashes, product tube.
- expected must_quote: ['arrived half dried out', 'dry and crumbly']
- model evidence: ["arrived half dried out", "the tube was barely sealed", "dried out on arrival", "the tube seal was loose"]
- model owner_line: Check tube seals and rotate stock before shipping today; several buyers got dried-out mascara from poor sealing, not a bad formula.
