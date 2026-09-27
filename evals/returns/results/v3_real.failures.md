# Failure report for v3

Summary: {"version": "v3", "model": "sonnet", "n": 10, "cause_accuracy": 0.6, "parsed_rate": 1.0, "grounded_rate": 0.7, "low_data_ok_rate": 0.0, "fix_rate": 1.0, "owner_line_rate": 0.9, "mean_latency_s": 20.5, "hard_subset_accuracy": 0.6, "gate_met": false}

## Confusion (expected -> got: count)
{
 "garment": {
  "expectation": 2,
  "garment": 1
 },
 "not_enough_data": {
  "fulfilment": 1,
  "not_enough_data": 1
 },
 "size_chart": {
  "garment": 1
 },
 "expectation": {
  "expectation": 3
 },
 "fulfilment": {
  "fulfilment": 1
 }
}

## Failed cases
### r01 (apparel) — cause expected garment got expectation
- returns: [{"reason_code": "quality", "size_ordered": "Large", "comment": "The dress looks exactly as pictured but the material is paper thin and cheap looking in real life. Not flattering unless you have the body of a store mannequin", "rating": 2, "review_title": "Thin, cheap material"}, {"reason_code": "quality", "size_ordered": "Large", "comment": "This dress is cute. It looks nice but it\u2019s so thin. The material is cheap. That is size of moves around if you\u2019re sitting down you\u2019re gonna slide out your seat. It wasn\u2019t worth $40.25 should\u2019ve been the most I believe after one Wa
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Club & Night Out
- expected must_quote: ['the material is paper thin and cheap looking in real life', 'you could see EVERYTHING underneath']
- model evidence: ["material is paper thin and cheap looking in real life", "you could see EVERYTHING underneath", "la tela es un poco transparente", "if you\u2019re sitting down you\u2019re gonna slide out your seat"]
- model owner_line: None

### r02 (apparel) — cause expected not_enough_data got fulfilment
- returns: [{"reason_code": "damaged", "size_ordered": "Medium", "comment": "The dress was nice with a good fit. My husband and I both loved it. I do see how the peal straps feel weak but my issue and the reason I returned it is that the side was all scratched up as though someone had snagged their jewelry in the side repeatedly and it smelled like body odor. Could not get the dress off of me fast enough. Amazon needs to put some big tags on the outside or something because it\u2019s a big issue of people returning clothing that has been worn.", "rating": 3, "review_title": "Was sent a used item"}, {"rea
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Club & Night Out
- expected must_quote: ['my pearl straps didnt come with 2', 'it smelled like body odor']
- model evidence: ["the side was all scratched up as though someone had snagged", "it smelled like body odor", "my pearl straps didnt come with 2"]
- model owner_line: Add a pre-ship check for cleanliness, odor, and both pearl straps attached to stop these arrival complaints.

### r03 (apparel) — cause expected size_chart got garment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "When purchasing this dress, I was hoping for a more modest, comfortable option for the colder months. It runs larger than expected, and since I am quite petite, (5'2\"), it's a longer length on me. I love the length, but the chest area doesn't fit me properly. If you're smaller chested like myself, it will have a saggy fit to it that you may have to constantly adjust. Otherwise, beautiful dress!", "rating": 3, "review_title": "Lovely silhouette, slightly big"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Why i
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['I ordered a small and it was down to my ankles', 'the dress is too long on me and hits just above my ankle instead of midi length']
- model evidence: ["it's a longer length on me", "is toooo long in me", "it was down to my ankles", "hits just above my ankle instead of midi length"]
- model owner_line: Contact your supplier about shortening the pattern block since buyers in both small and large sizes all report the dress running too long.

### r04 (apparel) — evidence not verbatim in inputs
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "The color and size are nice. The fabric is thin and cheap looking and the price reflects that. It shows every curve of your body so be prepared to wear shapewear underneath. I added a cardigan over it and it worked fine.", "rating": 3, "review_title": "Quality reflected in the price."}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "I love the color of the dress. It is just a little too clingy for my body. Boo hoo... it is beautiful.", "rating": 3, "review_title": "Beautiful dress"}, {"reason_code": "doesnt_fit", "s
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['The fabric is thin and cheap looking', 'Fit well but is see through']
- model evidence: ["fabric is thin and cheap looking", "is see through and won't be wearing it out", "shows every curve of your body"]
- model owner_line: Add a line disclosing the fabric's thinness and clinginess so buyers aren't surprised, since two returns cite this exact issue.

### r06 (shoes) — evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "10.5", "comment": "The one thing that I absolutely know, is what shoe size I wear in several brands and I am very consistent. When I first began to wear Altra running shoes, both the company and the runner that told me about them said I should go up a half size from my normal tennis shoe size. I always wore a 10 wide so I went to a 10.5 altra and they fit perfect! Since 2017 I have worn nothing but 10.5 Altra Olympus tennis shoes. So I purchased the Nortiv 8 in a 10.5 as well since every review I read said this would be the right size for me. I t
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Men > Shoes > Athletic > Running > Trail Running
- expected must_quote: ['Sizing seems to be all over the place', 'the sole was longer than my other shoes, but the actual shoe was too short']
- model evidence: ["Sizing seems to be all over the place!", "my foot was swimming in it", "the actual shoe was too short", "Feel All That It's Tight On The Front"]
- model owner_line: Hold off on any size-chart or garment change; collect measured foot-length data on the next few returns before acting.

### r08 (apparel) — evidence not verbatim in inputs
- returns: [{"reason_code": "not_as_described", "size_ordered": "X-Large", "comment": "It's cute but paper thin and see through so I can't wear it out unless layering EVERYTHING. It's soft but just not what I was expecting", "rating": 2, "review_title": "See through and thin material"}, {"reason_code": "not_as_described", "size_ordered": "XX-Large", "comment": "This is not ribbed knitted fabric, it's thin and cheap looking. Definitely not what is in the pictures.", "rating": 1, "review_title": "Not as pictured"}, {"reason_code": "quality", "size_ordered": "Small", "comment": "This sweater dress is just o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['paper thin and see through', 'This is not ribbed knitted fabric']
- model evidence: ["paper thin and see through", "This is not ribbed knitted fabric, it's thin and cheap looking", "it's thin, a bit see-through, and won\u2019t keep you warm", "Poor quality material, see thru"]
- model owner_line: Add a clear fabric-weight and sheerness warning to the listing today since four buyers were surprised the material is thin and see-through.

### r09 (apparel) — cause expected garment got expectation
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "Small", "comment": "This fit terribly!!! The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight! Terrible. Don\u2019t waste your money.", "rating": 1, "review_title": "Horrible"}, {"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "I wanted to love this sweater dress. The color is nice and the neckline is very attractive. It is the general bagginess and material thinness that I am not happy with. The body is straight and does not lay attractively on my body. It may look good super
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight', 'The sleeves are just way too wide']
- model evidence: ["material is see through in bright light", "thinner than I expected", "It is not very thick"]
- model owner_line: Add a fabric-weight and sheerness note to the listing today; three of four buyers called the material thinner than expected.
