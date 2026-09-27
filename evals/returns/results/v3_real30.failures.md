# Failure report for v3

Summary: {"version": "v3", "model": "sonnet", "n": 30, "cause_accuracy": 0.567, "parsed_rate": 0.967, "grounded_rate": 0.833, "low_data_ok_rate": 0.0, "fix_rate": 0.967, "owner_line_rate": 0.967, "mean_latency_s": 41.6, "hard_subset_accuracy": 0.567, "gate_met": false}

## Confusion (expected -> got: count)
{
 "garment": {
  "expectation": 3,
  "garment": 5,
  "fulfilment": 3,
  "not_enough_data": 1
 },
 "not_enough_data": {
  "fulfilment": 1,
  "not_enough_data": 2,
  "garment": 1
 },
 "size_chart": {
  "garment": 1,
  "fulfilment": 1,
  "size_chart": 1
 },
 "expectation": {
  "expectation": 7,
  "not_enough_data": 1,
  "None": 1
 },
 "fulfilment": {
  "fulfilment": 2
 }
}

## Failed cases
### r01 (apparel) — cause expected garment got expectation
- returns: [{"reason_code": "quality", "size_ordered": "Large", "comment": "The dress looks exactly as pictured but the material is paper thin and cheap looking in real life. Not flattering unless you have the body of a store mannequin", "rating": 2, "review_title": "Thin, cheap material"}, {"reason_code": "quality", "size_ordered": "Large", "comment": "This dress is cute. It looks nice but it\u2019s so thin. The material is cheap. That is size of moves around if you\u2019re sitting down you\u2019re gonna slide out your seat. It wasn\u2019t worth $40.25 should\u2019ve been the most I believe after one Wa
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Club & Night Out
- expected must_quote: ['the material is paper thin and cheap looking in real life', 'you could see EVERYTHING underneath']
- model evidence: ["paper thin and cheap looking", "you could see EVERYTHING underneath", "la tela es un poco transparente"]
- model owner_line: Add a fabric bullet disclosing the fabric is lightweight and slightly sheer, since five buyers independently flagged see-through fabric today.

### r02 (apparel) — cause expected not_enough_data got fulfilment
- returns: [{"reason_code": "damaged", "size_ordered": "Medium", "comment": "The dress was nice with a good fit. My husband and I both loved it. I do see how the peal straps feel weak but my issue and the reason I returned it is that the side was all scratched up as though someone had snagged their jewelry in the side repeatedly and it smelled like body odor. Could not get the dress off of me fast enough. Amazon needs to put some big tags on the outside or something because it\u2019s a big issue of people returning clothing that has been worn.", "rating": 3, "review_title": "Was sent a used item"}, {"rea
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Club & Night Out
- expected must_quote: ['my pearl straps didnt come with 2', 'it smelled like body odor']
- model evidence: ["the side was all scratched up", "it smelled like body odor", "my pearl straps didnt come with 2"]
- model owner_line: Add a pre-ship check for wear, smell, and both pearl straps before packing, since one return showed both damage and odor together.

### r03 (apparel) — cause expected size_chart got garment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "When purchasing this dress, I was hoping for a more modest, comfortable option for the colder months. It runs larger than expected, and since I am quite petite, (5'2\"), it's a longer length on me. I love the length, but the chest area doesn't fit me properly. If you're smaller chested like myself, it will have a saggy fit to it that you may have to constantly adjust. Otherwise, beautiful dress!", "rating": 3, "review_title": "Lovely silhouette, slightly big"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Why i
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['I ordered a small and it was down to my ankles', 'the dress is too long on me and hits just above my ankle instead of midi length']
- model evidence: ["hits just above my ankle instead of midi length", "is toooo long in me", "the chest area doesn't fit me properly", "made to look good on very small people"]
- model owner_line: Tell your supplier to shorten the hem and tighten the bust cut, since several buyers report the dress running long and loose there.

### r04 (apparel) — evidence not verbatim in inputs
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "The color and size are nice. The fabric is thin and cheap looking and the price reflects that. It shows every curve of your body so be prepared to wear shapewear underneath. I added a cardigan over it and it worked fine.", "rating": 3, "review_title": "Quality reflected in the price."}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "I love the color of the dress. It is just a little too clingy for my body. Boo hoo... it is beautiful.", "rating": 3, "review_title": "Beautiful dress"}, {"reason_code": "doesnt_fit", "s
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['The fabric is thin and cheap looking', 'Fit well but is see through']
- model evidence: ["fabric is thin and cheap looking", "shows every curve of your body", "is see through and won't be wearing it out", "a little too clingy for my body"]
- model owner_line: Add a fabric/sheerness disclosure to the listing today so buyers aren't surprised by how thin and clingy the knit is.

### r05 (shoes) — evidence not verbatim in inputs
- returns: [{"reason_code": "quality", "size_ordered": "11", "comment": "The shoes are comfy right out of the box and fit my foot well. I have owned them for about 2 months, with minimal runs during that time, and the tread near the balls of my feet are already gone. I wondered if they came that way and I just hadn't noticed, but I have a second pair I've bought as a backup and the tread is fully intact in the same region of that shoe. I know these are \"trail\" shoes, but after12 miles of pavement running in the last week I could easily see the difference in tread height between Sunday and Saturday. I k
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Men > Shoes > Athletic > Running > Trail Running
- expected must_quote: ['the tread near the balls of my feet are already gone', 'the soles are already worn to the point where traction on wet pavement and loose gravel is significantly reduced']
- model evidence: ["tread near the balls of my feet are already gone", "soles are already worn to the point where traction on wet pavement and loose gravel is significantly reduced", "the tread is less and they dont feel as comfortable"]
- model owner_line: Ask your supplier to test outsole durability, since three buyers report the tread wearing out within months.

### r08 (apparel) — evidence not verbatim in inputs
- returns: [{"reason_code": "not_as_described", "size_ordered": "X-Large", "comment": "It's cute but paper thin and see through so I can't wear it out unless layering EVERYTHING. It's soft but just not what I was expecting", "rating": 2, "review_title": "See through and thin material"}, {"reason_code": "not_as_described", "size_ordered": "XX-Large", "comment": "This is not ribbed knitted fabric, it's thin and cheap looking. Definitely not what is in the pictures.", "rating": 1, "review_title": "Not as pictured"}, {"reason_code": "quality", "size_ordered": "Small", "comment": "This sweater dress is just o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['paper thin and see through', 'This is not ribbed knitted fabric']
- model evidence: ["paper thin and see through", "This is not ribbed knitted fabric, it's thin and cheap looking", "it's thin, a bit see-through, and won\u2019t keep you warm", "Material is very thin. Took picture holding it up to the light"]
- model owner_line: Add a fabric-weight and sheerness disclosure to the listing today since four returns describe the material as thin and see-through, not as pictured.

### r09 (apparel) — cause expected garment got expectation
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "Small", "comment": "This fit terribly!!! The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight! Terrible. Don\u2019t waste your money.", "rating": 1, "review_title": "Horrible"}, {"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "I wanted to love this sweater dress. The color is nice and the neckline is very attractive. It is the general bagginess and material thinness that I am not happy with. The body is straight and does not lay attractively on my body. It may look good super
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight', 'The sleeves are just way too wide']
- model evidence: ["material thinness that I am not happy with", "material is see through in bright light", "thinner than expected", "It is not very thick"]
- model owner_line: Add a fabric-weight and sheerness note to the listing today since three separate buyers said it was thinner than they expected.

### r13 (apparel) — cause expected size_chart got fulfilment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "20 Plus", "comment": "I like the fit but they are bit tight due to my big thighs. Good durable material and they are comfortable. Nice and thick", "rating": 3, "review_title": "Jeans"}, {"reason_code": "doesnt_fit", "size_ordered": "14 Plus", "comment": "Super cute, extremely comfortable but very short. They come all the way up to your ankles and I\u2019m only 5\u20184\u201c. Additionally, it took over a month for me to get these jeans.", "rating": 3, "review_title": "Cute but not worth the wait"}, {"reason_code": "doesnt_fit", "size_ordered": "1
- size_chart: "Default variant 14 Plus: Inseam Length 27.9 inches; Waist Size 32.2 inches (Amazon 'Product information'). Bullet: Please check our Size Chart Image before placing an order. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['purchased based on measurements and Amazon recommendation', 'used chart and reviews', 'these jeans were comically too big']
- model evidence: ["opened box to find a weird top instead - jeans NOT shipped", "taking weeks to arrive", "Came on a Sunday and sat in a OPEN mailbox"]
- model owner_line: Audit your packing and label-matching process today, since one order shipped the wrong item and arrived weeks late.

### r14 (apparel) — cause expected garment got expectation
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "Tighter in waste and legs that I expected. No wrinkles, the fabric holds up nice, and I think overall it's worth the money. Just not very happy with the fit. You don't wear these to be warm, they keep you about the same as jeans probably a bit cooler.", "rating": 3, "review_title": "Tighter than expected, otherwise great."}, {"reason_code": "doesnt_fit", "size_ordered": "Large", "comment": "I ordered these based on my usual pant size and they were a mess. The waist ran small while the length width was tight, so I ended up wi
- size_chart: "Default variant Small: Waist Size 30 inches (Amazon 'Product information'). Bullet: check the detailed size chart including multiple inseam options. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 9 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the button already fell off after normal use', 'already got a hole on it after 2 wears', 'The stitches on the side legs are ripping out']
- model evidence: ["The fabric also feels thinner than I expected from the photos", "sticks to the body", "heavy-duty twill offers incredible airflow and wrinkle resistance"]
- model owner_line: Update the fabric bullet to say lightweight twill, not heavy-duty, since buyers found it thinner than described.

### r15 (apparel) — cause expected garment got fulfilment
- returns: [{"reason_code": "wrong_item", "size_ordered": "34W x 32L", "comment": "So I purchased 5 of these pants in 2 orders. The first one came great, for the 2nd order..which was 4 of the pants..they sent me a white pants instead of the navy blue which was ordered. The white pants was also the incorrect size. All of the others were correct. These fit great and the quality is good. Would have rated 5stars if not for the error.", "rating": 3, "review_title": "Rating would have been higher"}, {"reason_code": "quality", "size_ordered": "36W x 30L", "comment": "Had better luck with other colors. These loo
- size_chart: "Sold as waist x length (e.g. 28W x 30L). Default variant: Waist Size 28 inches, Inseam 30 inches (Amazon 'Product information'). No separate chart text returned."
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['The button was held in place by exactly 4 individual threads', 'The Zipper is horrible', 'at least two sizes smaller']
- model evidence: ["sent me a white pants instead of the navy blue", "was also the incorrect size"]
- model owner_line: Add a packing checklist step today to confirm color and size before shipping multi-item orders to prevent wrong-item mix-ups.

### r16 (apparel) — cause expected garment got fulfilment
- returns: [{"reason_code": "damaged", "size_ordered": "20 Plus", "comment": "Material nice, flowy , Color perfect. Size good. Only issue had a strong odor of perfume. Im not sure if it woren and tag never removed. I had to wash it twice due to odor and dye.", "rating": 3, "review_title": "Nice Fit"}, {"reason_code": "not_as_described", "size_ordered": "24 Plus", "comment": "No lining. So of course, very see through. Will be returning. I think it's the right length im 5'9\". The 3x fits like a 2x. Stretchy. Just not right.", "rating": 2, "review_title": "Not lined."}, {"reason_code": "quality", "size_ord
- size_chart: "Sizes 14 Plus \u2013 26 Plus. Amazon 'Product information' lists Shoulder to Bottom Hem Length: 12 inches (as scraped). Bullet: check the size chart for exact back-length measurements by size. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['I trip over the hem often', 'Way too long', 'the dress was made for someone 6’ at least']
- model evidence: ["strong odor of perfume", "tag never removed", "It had animal hair all over"]
- model owner_line: Inspect and re-tag every returned dress before restocking it so worn or used items stop reaching new buyers.

### r18 (apparel) — evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "This is a good looking suit and seems well made. The color contrast definitely accentuates the curves. It absolutely isn't great for long torso or taller people. I needed something for a vacation and made it work, but I wouldn't have worn it in public. The inserts for the built in bra (and the 'cups/shelf' were well under where my bra should be, but the neckline was high enough that I made it work. There is also no tummy control really. The price is great, so for shorter/regular torso people it should be a great option.", "rating
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 9 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['These are extremely undersized', 'Runs very small. Order larger than you think you need', 'runs really small']
- model evidence: ["This item runs small and tight", "These are extremely undersized", "runs really small but should be labeled small", "Runs very small. Order larger than you think"]
- model owner_line: Ask your supplier to re-check the pattern grading since buyers in three different sizes all report the suit running small.

### r22 (apparel) — cause expected not_enough_data got garment
- returns: [{"reason_code": "quality", "size_ordered": "36A", "comment": "Makes the girls look great and fits well. But does not at all stay where it\u2019s supposed to be and constantly rides up", "rating": 3, "review_title": "Constantly rides up"}, {"reason_code": "quality", "size_ordered": "36B", "comment": "So the overall look of the bra is nice but the \u201cx\u201d design un the front is annoying. I\u2019m guessing they designed it for looks over function because as others have stated it\u2019s uncomfortable. As for quality I think I expected more from a bra in this price point, mostly because I ha
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Runs very small', 'Cups are too big', 'To big and does not conform to my body']
- model evidence: ["the cups are too big", "kept popping out the top", "constantly rides up", "does not conform to my body"]
- model owner_line: Message your supplier about inconsistent cup-to-band grading today, since buyers report both too-big and too-small cups across sizes.

### r24 (apparel) — cause expected expectation got not_enough_data
- returns: [{"reason_code": "not_as_described", "size_ordered": null, "comment": "I ordered these High Waisted - No See Through - Tummy Control Leggings in size X-XL in black. I was keen to see how these compared with a couple different brands of leggings sold on Amazon. These leggings seemed to be true to size. I\u2019m 5 foot 8 inches tall, and the leggings fit based on my height and my weight which is approximately 155 - 160 lbs . It was easy to get into these leggings when sitting down. The length of the leggings was also a good match for my height. These leggings feel \u201cbuttery soft\u201d as oth
- size_chart: "\"Small / Medium = One Size US 2-14\", \"Large / X-Large = Plus Size US 14-20\" or \"XX-Large = Extra Size US 22-28 \". 26 INCH Length. (Sizing text from the bullets/A+; no measurement table returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 5 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Not opaque, easy to see your undies', "Most don't have pockets", 'Very thin material']
- model evidence: ["too small. So I ordered one size larger", "Im pulling them up at tunes", "color bleeds very badly even after multiple washes", "material smells like burned hair"]
- model owner_line: Log size ordered and the specific reason for the next several returns before changing photos, chart, or garment—current complaints are scattered, not a pattern.

### r25 (apparel) — cause expected garment got fulfilment
- returns: [{"reason_code": "quality", "size_ordered": "Large", "comment": "I\u2019m so bummed. I bought this hoodie in gray early 2026 and love it so much. It\u2019s the best hoodie I\u2019ve ever owned. High quality and thick and has held up in the wash. Now that the cold weather is back I had to buy the same one in black.. and it\u2019s changed. It\u2019s not the same hoodie. It\u2019s thin and feels cheap. So so sad. I\u2019ll keep it for around the house but wish I bought more of them right after my initial purchase. \ud83d\ude22", "rating": 3, "review_title": "Quality has changed"}, {"reason_code":
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the color bled after just a couple washes', 'After washing it the color faded even more', 'the neck hole was huge']
- model evidence: ["arrived stuffed in a bag all wrinkled and smelling", "5 were worn, perfume soaked, bad smelling", "and it was huge and the color was rather pale blue"]
- model owner_line: Check stock condition and repackage before shipping today; one buyer got several worn, smelly, poorly packed hoodies.

### r26 (apparel) — no JSON parsed; cause expected expectation got None; evidence not verbatim in inputs
- returns: [{"reason_code": "not_as_described", "size_ordered": null, "comment": "I like the Tiyomi tops as they are soft and fit well, but this color was called \"teal blue sequin\" and was actually a HUNTER GREEN. There wasn't enough contrast between the top color and sequins so it wasn't as flattering as other designs where the sleeves are more different ... plus I prefer V-neck and this was a crew neck. Unfortunately, I had to return this green one.", "rating": 3, "review_title": "Teal color is actually HUNTER GREEN", "colour_ordered": "#9_ B0_ Teal _ Sequin"}, {"reason_code": "changed_mind", "size_o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 5 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['The shirt is see through', 'It is sheer and shows everything', 'Teal color is actually HUNTER GREEN']
- model evidence: null
- model owner_line: None

### r29 (apparel) — cause expected garment got not_enough_data
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Beautiful but the fit was not it. The material was decent quality.", "rating": 3, "review_title": "Runs smaller than what it should.", "colour_ordered": "Celadon"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Super cute but way too tight & short on the bottom. I liked everything else about it though. Ultimately I decided to return it.", "rating": 1, "review_title": "Cute but not what I expected", "colour_ordered": "White"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Stiff fabric. Fit is of
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['too big on top and too small on the bottom', 'way too tight & short on the bottom', 'Ran small had to send back']
- model evidence: ["too big on top and too small on the bottom", "Ran small had to send back", "Stiff fabric. Fit is off", "True to size. Nice quality material, just not the right fit."]
- model owner_line: Start recording exact size ordered and specific fit complaint on new returns before changing anything, since current reports conflict.
