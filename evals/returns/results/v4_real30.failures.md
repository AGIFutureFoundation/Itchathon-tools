# Failure report for v4

Summary: {"version": "v4", "model": "sonnet", "n": 30, "cause_accuracy": 0.467, "parsed_rate": 1.0, "grounded_rate": 0.967, "low_data_ok_rate": 0.0, "fix_rate": 1.0, "owner_line_rate": 0.967, "mean_latency_s": 55.9, "hard_subset_accuracy": 0.467, "gate_met": false}

## Confusion (expected -> got: count)
{
 "garment": {
  "garment": 9,
  "fulfilment": 1,
  "size_chart": 2
 },
 "not_enough_data": {
  "garment": 1,
  "not_enough_data": 1,
  "size_chart": 2
 },
 "size_chart": {
  "size_chart": 2,
  "garment": 1
 },
 "expectation": {
  "garment": 4,
  "expectation": 2,
  "size_chart": 3
 },
 "fulfilment": {
  "garment": 1,
  "size_chart": 1
 }
}

## Failed cases
### r02 (apparel) — cause expected not_enough_data got garment
- returns: [{"reason_code": "damaged", "size_ordered": "Medium", "comment": "The dress was nice with a good fit. My husband and I both loved it. I do see how the peal straps feel weak but my issue and the reason I returned it is that the side was all scratched up as though someone had snagged their jewelry in the side repeatedly and it smelled like body odor. Could not get the dress off of me fast enough. Amazon needs to put some big tags on the outside or something because it\u2019s a big issue of people returning clothing that has been worn.", "rating": 3, "review_title": "Was sent a used item"}, {"rea
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Club & Night Out
- expected must_quote: ['my pearl straps didnt come with 2', 'it smelled like body odor']
- model evidence: ["the pearl straps keep sliding down", "my pearl straps didnt come with 2", "the peal straps feel weak"]
- model owner_line: Message your supplier today about the pearl strap construction, since three separate buyers reported straps that are weak, missing, or sliding down.

### r04 (apparel) — cause expected expectation got garment
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "The color and size are nice. The fabric is thin and cheap looking and the price reflects that. It shows every curve of your body so be prepared to wear shapewear underneath. I added a cardigan over it and it worked fine.", "rating": 3, "review_title": "Quality reflected in the price."}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "I love the color of the dress. It is just a little too clingy for my body. Boo hoo... it is beautiful.", "rating": 3, "review_title": "Beautiful dress"}, {"reason_code": "doesnt_fit", "s
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['The fabric is thin and cheap looking', 'Fit well but is see through']
- model evidence: ["The fabric is thin and cheap looking", "Fit well but is see through"]
- model owner_line: Message your supplier today about the thin, see through fabric and get a heavier sample before reordering this dress.

### r08 (apparel) — cause expected expectation got garment
- returns: [{"reason_code": "not_as_described", "size_ordered": "X-Large", "comment": "It's cute but paper thin and see through so I can't wear it out unless layering EVERYTHING. It's soft but just not what I was expecting", "rating": 2, "review_title": "See through and thin material"}, {"reason_code": "not_as_described", "size_ordered": "XX-Large", "comment": "This is not ribbed knitted fabric, it's thin and cheap looking. Definitely not what is in the pictures.", "rating": 1, "review_title": "Not as pictured"}, {"reason_code": "quality", "size_ordered": "Small", "comment": "This sweater dress is just o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['paper thin and see through', 'This is not ribbed knitted fabric']
- model evidence: ["paper thin and see through", "thin and cheap looking", "Poor quality material, see thru, would not recommend"]
- model owner_line: Message your supplier today to thicken the knit fabric, since four separate buyers independently called it thin, cheap, and see through.

### r10 (shoes) — cause expected fulfilment got garment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "7.5", "comment": "Size was too small and wasn't given the option to exchange like it says. Was told could do refund but they send you a return label that you still have to pay postage. Paid $43 for shoes would cost me over$80 to send shoes back. How does that make sense.", "rating": 1, "review_title": "SCAM???? Don't buy unless you know exactly what size you where in foreign sizes."}, {"reason_code": "damaged", "size_ordered": "7.5", "comment": "It took nearly a month to get these. Tracking was garbage for a while. They didn't come in a box, they
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Shoes > Boots > Ankle & Bootie
- expected must_quote: ['It took nearly a month to get these', "They didn't come in a box, they came bubble wrapped in a bag"]
- model evidence: ["feels like it was made in a toy factory", "but definitely cheap quality"]
- model owner_line: Message your supplier today about the cheap soles and laces so the next batch uses sturdier materials.

### r11 (apparel) — cause expected fulfilment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "The style, color, shape, stitching, length, etc. were all great. However, know this is more Miss sizing vs woman sizing. The XL is more like a women\u2019s 14 vs 16-18 in the waist. I should have read the size chart instead of getting my normal size. They fit everywhere else, but waist was about 4 inches too small.", "rating": 3, "review_title": "Waist runs very small"}, {"reason_code": "doesnt_fit", "size_ordered": "Medium", "comment": "Way too long for petite.", "rating": 3, "review_title": "Too long"}, {"reason_code": "ch
- size_chart: "Inseam of the jeans for women: 30\". GRAPENT tummy control jeans for women run true to standard US sizes. Size X-Small fits size 0 to size 2, Size Small fits size 4 to size 6, Size Medium fits size 8 to size 10, Size Large fits size 12 to size 14, Size X-Large fits size 16 to size 18, Size XX-Large
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['was sent jeans that have been tried on or worn', 'They arrived used and stinky']
- model evidence: ["should have read the size chart instead of getting my normal size", "States XS is size 0-2 and these are WAY too big", "M is more like a 10-11 US"]
- model owner_line: Publish measured waist-in-inches rows for each size today, since two customers show the size chart does not match actual fit.

### r12 (apparel) — cause expected expectation got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "4X-Large", "comment": "No, not the correct size in the U.S. 2X is small and 3X is small as well not or barely 1X size", "rating": 1, "review_title": "go to a non online store and try them on...You'll thank me.."}, {"reason_code": "doesnt_fit", "size_ordered": "5X-Large", "comment": "Ordered these in a very big size (4x) intentionally cos I wanted the effortlessly chic slouchy look.. Well...lol the fit was very big and not in a cute way.. They were not soft they were actually kinda stiff.. If they stretched I wouldn't know because I bought these u
- size_chart: "NOTE: The women plus jeans size of S-2XL is a little larger than regular size,so it is recommended to choose a smaller size.The size of 3xl-5xl is a little smaller than the regular size,so it is recommended to choose one size larger.Please refer to the size chart! (Sizing note from the bullets; the
- photos_note: Amazon listing scraped via Apify; 5 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Material is really thin, tears easily', 'The material is thin', 'Thin material']
- model evidence: ["3X is small as well not or barely 1X size", "It does not fit like a 1x", "recommended to choose one size larger"]
- model owner_line: Measure a few finished garments across sizes today and publish exact waist and hip numbers to replace the vague sizing note causing repeat wrong-size returns.

### r13 (apparel) — cause expected size_chart got garment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "20 Plus", "comment": "I like the fit but they are bit tight due to my big thighs. Good durable material and they are comfortable. Nice and thick", "rating": 3, "review_title": "Jeans"}, {"reason_code": "doesnt_fit", "size_ordered": "14 Plus", "comment": "Super cute, extremely comfortable but very short. They come all the way up to your ankles and I\u2019m only 5\u20184\u201c. Additionally, it took over a month for me to get these jeans.", "rating": 3, "review_title": "Cute but not worth the wait"}, {"reason_code": "doesnt_fit", "size_ordered": "1
- size_chart: "Default variant 14 Plus: Inseam Length 27.9 inches; Waist Size 32.2 inches (Amazon 'Product information'). Bullet: Please check our Size Chart Image before placing an order. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['purchased based on measurements and Amazon recommendation', 'used chart and reviews', 'these jeans were comically too big']
- model evidence: ["the hem on bottom of pants is frayed on the outside", "there are already holes in the thighs"]
- model owner_line: Message your supplier today about the frayed hems and thigh holes from two returns before approving the next production run.

### r16 (apparel) — cause expected garment got fulfilment
- returns: [{"reason_code": "damaged", "size_ordered": "20 Plus", "comment": "Material nice, flowy , Color perfect. Size good. Only issue had a strong odor of perfume. Im not sure if it woren and tag never removed. I had to wash it twice due to odor and dye.", "rating": 3, "review_title": "Nice Fit"}, {"reason_code": "not_as_described", "size_ordered": "24 Plus", "comment": "No lining. So of course, very see through. Will be returning. I think it's the right length im 5'9\". The 3x fits like a 2x. Stretchy. Just not right.", "rating": 2, "review_title": "Not lined."}, {"reason_code": "quality", "size_ord
- size_chart: "Sizes 14 Plus \u2013 26 Plus. Amazon 'Product information' lists Shoulder to Bottom Hem Length: 12 inches (as scraped). Bullet: check the size chart for exact back-length measurements by size. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['I trip over the hem often', 'Way too long', 'the dress was made for someone 6’ at least']
- model evidence: ["it woren and tag never removed", "appears to be a returned item"]
- model owner_line: Add a smell and tag check before packing orders; two returns arrived used or with animal hair, pointing to a quality-control gap, not sizing.

### r17 (apparel) — cause expected expectation got garment
- returns: [{"reason_code": "damaged", "size_ordered": null, "comment": "Cute dress but the bows are not functional to where you can re-tie them and the were sewn on sideways instead of right side up. I ended up just removing them from the dress entirely. Other than that, dress worked out fine for family pictures", "rating": 3, "review_title": "Bows sewn on crooked and not functional", "colour_ordered": "Brown"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "This dress was such a disappointment. It looks so cute in the picture, but the fabric feels extremely cheap for both the dre
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 4 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the fabric feels extremely cheap', 'the material feels like plastic', 'Fabric felt like parachute fabric']
- model evidence: ["sewn on sideways instead of right side up", "bows are sewn off center and the collar is loose"]
- model owner_line: Message the supplier today about crooked bows and loose collars and get a corrected sample before the next production run.

### r18 (apparel) — evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "This is a good looking suit and seems well made. The color contrast definitely accentuates the curves. It absolutely isn't great for long torso or taller people. I needed something for a vacation and made it work, but I wouldn't have worn it in public. The inserts for the built in bra (and the 'cups/shelf' were well under where my bra should be, but the neckline was high enough that I made it work. There is also no tummy control really. The price is great, so for shorter/regular torso people it should be a great option.", "rating
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 9 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['These are extremely undersized', 'Runs very small. Order larger than you think you need', 'runs really small']
- model evidence: ["the legs had no elastic", "the strap at the top has started to loosen threads", "does not offer much support for large busted women"]
- model owner_line: Message your supplier about the loose threads, color bleeding, missing elastic, and weak bust support before the next production run.

### r21 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "not_as_described", "size_ordered": "Medium", "comment": "I purchased this bra in size M in plum (the name of the hot pink colour.) I wear a 36C bra normally, and this sports bra fit me perfectly. The fabric is incredibly soft and comfortable. It has held up well to washing (no shrink, loss of shape, or issues with colour bleeding.) The reason I gave this bra only 3 stars is that it offers very little support, and the cups are not really appropriately sized. I was hoping for a running bra, but this is actually the least supportive of all of the bras and bralettes I own. I deci
- size_chart: "Two charts are shown on the page: 'Original Size Chart' and 'Updated Size Chart' ('fits slightly larger than the old one'; items labeled 'New size' use the updated chart). Both tables are images not returned by the scraper."
- photos_note: Amazon listing scraped via Apify; 7 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['This bra runs VERY SMALL', 'you need to go up a size to have it fit comfortably', 'it fits like a large']
- model evidence: ["the size chart ordering an XL and it fits like a large", "runs VERY SMALL", "so snug I need help taking it off"]
- model owner_line: Publish measured rows for both the original and updated size charts today, because most returns show the bra fitting smaller than buyers expected from sizing.

### r22 (apparel) — cause expected not_enough_data got size_chart
- returns: [{"reason_code": "quality", "size_ordered": "36A", "comment": "Makes the girls look great and fits well. But does not at all stay where it\u2019s supposed to be and constantly rides up", "rating": 3, "review_title": "Constantly rides up"}, {"reason_code": "quality", "size_ordered": "36B", "comment": "So the overall look of the bra is nice but the \u201cx\u201d design un the front is annoying. I\u2019m guessing they designed it for looks over function because as others have stated it\u2019s uncomfortable. As for quality I think I expected more from a bra in this price point, mostly because I ha
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Runs very small', 'Cups are too big', 'To big and does not conform to my body']
- model evidence: ["Runs very small", "the cups are too big", "kept popping out the top"]
- model owner_line: Publish measured size rows today because buyers are picking wrong sizes in both directions with no chart to guide them.

### r23 (apparel) — cause expected expectation got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "The bra feels comfortable but it is not meant for small cup sizes. Love the bra. Hate the fit on me. From a 32A.", "rating": 3, "review_title": "Size not accurate"}, {"reason_code": "changed_mind", "size_ordered": null, "comment": "I really wanted to love this bra because it has a lot going for it. It's incredibly comfortable, the sizing is accurate, and it has held up surprisingly well after multiple washes and trips through the dryer. It didn't shrink or lose its shape or color. However, I noticed one very unexpected issue: I s
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the roll up nonstop', 'the strap keeps falling down', 'This does not hold you up in any way']
- model evidence: ["went according to the size chart", "but way too small", "Cups are too big"]
- model owner_line: Measure the garment and publish band and cup numbers today since buyers report cups too small for large busts and too loose for small ones.

### r24 (apparel) — cause expected expectation got size_chart
- returns: [{"reason_code": "not_as_described", "size_ordered": null, "comment": "I ordered these High Waisted - No See Through - Tummy Control Leggings in size X-XL in black. I was keen to see how these compared with a couple different brands of leggings sold on Amazon. These leggings seemed to be true to size. I\u2019m 5 foot 8 inches tall, and the leggings fit based on my height and my weight which is approximately 155 - 160 lbs . It was easy to get into these leggings when sitting down. The length of the leggings was also a good match for my height. These leggings feel \u201cbuttery soft\u201d as oth
- size_chart: "\"Small / Medium = One Size US 2-14\", \"Large / X-Large = Plus Size US 14-20\" or \"XX-Large = Extra Size US 22-28 \". 26 INCH Length. (Sizing text from the bullets/A+; no measurement table returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 5 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Not opaque, easy to see your undies', "Most don't have pockets", 'Very thin material']
- model evidence: ["too small. So I ordered one size larger", "Maybe i shoukd have had a bigger size"]
- model owner_line: Publish measured waist, hip and inseam rows today because two buyers found these run small and had to size up.

### r26 (apparel) — cause expected expectation got garment
- returns: [{"reason_code": "not_as_described", "size_ordered": null, "comment": "I like the Tiyomi tops as they are soft and fit well, but this color was called \"teal blue sequin\" and was actually a HUNTER GREEN. There wasn't enough contrast between the top color and sequins so it wasn't as flattering as other designs where the sleeves are more different ... plus I prefer V-neck and this was a crew neck. Unfortunately, I had to return this green one.", "rating": 3, "review_title": "Teal color is actually HUNTER GREEN", "colour_ordered": "#9_ B0_ Teal _ Sequin"}, {"reason_code": "changed_mind", "size_o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 5 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['The shirt is see through', 'It is sheer and shows everything', 'Teal color is actually HUNTER GREEN']
- model evidence: ["The material is cheap", "the material on the sleaves was very scratchy", "more like a nylon than cotton"]
- model owner_line: Message your supplier today about the thin, see-through, scratchy fabric buyers describe and request a thicker sample before your next production run.

### r29 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Beautiful but the fit was not it. The material was decent quality.", "rating": 3, "review_title": "Runs smaller than what it should.", "colour_ordered": "Celadon"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Super cute but way too tight & short on the bottom. I liked everything else about it though. Ultimately I decided to return it.", "rating": 1, "review_title": "Cute but not what I expected", "colour_ordered": "White"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Stiff fabric. Fit is of
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['too big on top and too small on the bottom', 'way too tight & short on the bottom', 'Ran small had to send back']
- model evidence: ["Runs smaller than what it should", "way too tight & short on the bottom", "Ran small had to send back"]
- model owner_line: Publish measured bust, waist, hip and length rows today because several buyers say this romper runs small and tight, causing avoidable returns.

### r30 (shoes) — cause expected not_enough_data got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "8 Toddler", "comment": "Sizing chart is pretty inaccurate. Order the toddler size 8 and they are significantly larger than a size 8", "rating": 3, "review_title": "Sizing inaccurate"}, {"reason_code": "doesnt_fit", "size_ordered": "8 Toddler", "comment": "Insanely large. Ordered 8 toddler for my kid who is this size in other brands. At least two sizes too big ??? Quality seems fine, style as pictured, and lightweight", "rating": 2, "review_title": "WAY too big"}, {"reason_code": "quality", "size_ordered": "7 Big Kid", "comment": "These snowboots 
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Sizing chart is pretty inaccurate', 'At least two sizes too big']
- model evidence: ["Sizing chart is pretty inaccurate", "At least two sizes too big"]
- model owner_line: Measure your boot sizes today and publish accurate chart rows since two buyers found the toddler size runs large.
