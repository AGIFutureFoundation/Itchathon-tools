# Failure report for v2

Summary: {"version": "v2", "model": "sonnet", "n": 30, "cause_accuracy": 0.1, "parsed_rate": 0.9, "grounded_rate": 0.767, "low_data_ok_rate": 0.0, "fix_rate": 0.9, "owner_line_rate": 0.867, "mean_latency_s": 31.1, "hard_subset_accuracy": 0.1, "gate_met": false}

## Confusion (expected -> got: count)
{
 "garment": {
  "garment": 2,
  "size_chart": 9,
  "photos": 1
 },
 "not_enough_data": {
  "fulfilment": 1,
  "size_chart": 3
 },
 "size_chart": {
  "None": 2,
  "garment": 1
 },
 "expectation": {
  "size_chart": 4,
  "garment": 1,
  "None": 1,
  "photos": 2,
  "expectation": 1
 },
 "fulfilment": {
  "garment": 1,
  "size_chart": 1
 }
}

## Failed cases
### r02 (apparel) — cause expected not_enough_data got fulfilment
- returns: [{"reason_code": "damaged", "size_ordered": "Medium", "comment": "The dress was nice with a good fit. My husband and I both loved it. I do see how the peal straps feel weak but my issue and the reason I returned it is that the side was all scratched up as though someone had snagged their jewelry in the side repeatedly and it smelled like body odor. Could not get the dress off of me fast enough. Amazon needs to put some big tags on the outside or something because it\u2019s a big issue of people returning clothing that has been worn.", "rating": 3, "review_title": "Was sent a used item"}, {"rea
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Club & Night Out
- expected must_quote: ['my pearl straps didnt come with 2', 'it smelled like body odor']
- model evidence: ["it smelled like body odor", "my pearl straps didnt come with 2!! I got one", "the peal straps feel weak", "the side was all scratched up as though someone had snagged their jewelry"]
- model owner_line: Add a two-strap and no-visible-wear check before every shipment, since incomplete or previously-worn units caused two of five returns.

### r03 (apparel) — no JSON parsed; cause expected size_chart got None; evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "When purchasing this dress, I was hoping for a more modest, comfortable option for the colder months. It runs larger than expected, and since I am quite petite, (5'2\"), it's a longer length on me. I love the length, but the chest area doesn't fit me properly. If you're smaller chested like myself, it will have a saggy fit to it that you may have to constantly adjust. Otherwise, beautiful dress!", "rating": 3, "review_title": "Lovely silhouette, slightly big"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Why i
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['I ordered a small and it was down to my ankles', 'the dress is too long on me and hits just above my ankle instead of midi length']
- model evidence: null
- model owner_line: None

### r04 (apparel) — cause expected expectation got size_chart
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "The color and size are nice. The fabric is thin and cheap looking and the price reflects that. It shows every curve of your body so be prepared to wear shapewear underneath. I added a cardigan over it and it worked fine.", "rating": 3, "review_title": "Quality reflected in the price."}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "I love the color of the dress. It is just a little too clingy for my body. Boo hoo... it is beautiful.", "rating": 3, "review_title": "Beautiful dress"}, {"reason_code": "doesnt_fit", "s
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['The fabric is thin and cheap looking', 'Fit well but is see through']
- model evidence: ["made for skinny girls", "a little too clingy for my body", "The fabric is thin and cheap looking and the price reflects that"]
- model owner_line: Publish a bust/waist/hip size chart today since two buyers called the fit skinny-only and none currently exists.

### r05 (shoes) — evidence not verbatim in inputs
- returns: [{"reason_code": "quality", "size_ordered": "11", "comment": "The shoes are comfy right out of the box and fit my foot well. I have owned them for about 2 months, with minimal runs during that time, and the tread near the balls of my feet are already gone. I wondered if they came that way and I just hadn't noticed, but I have a second pair I've bought as a backup and the tread is fully intact in the same region of that shoe. I know these are \"trail\" shoes, but after12 miles of pavement running in the last week I could easily see the difference in tread height between Sunday and Saturday. I k
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Men > Shoes > Athletic > Running > Trail Running
- expected must_quote: ['the tread near the balls of my feet are already gone', 'the soles are already worn to the point where traction on wet pavement and loose gravel is significantly reduced']
- model evidence: ["the tread near the balls of my feet are already gone", "the soles are already worn to the point where traction", "the sole material is simply not durable", "have a soft squishy feel that I find unstable"]
- model owner_line: Contact your supplier about outsole durability since multiple buyers report tread wearing out within months of light use.

### r06 (shoes) — cause expected not_enough_data got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "10.5", "comment": "The one thing that I absolutely know, is what shoe size I wear in several brands and I am very consistent. When I first began to wear Altra running shoes, both the company and the runner that told me about them said I should go up a half size from my normal tennis shoe size. I always wore a 10 wide so I went to a 10.5 altra and they fit perfect! Since 2017 I have worn nothing but 10.5 Altra Olympus tennis shoes. So I purchased the Nortiv 8 in a 10.5 as well since every review I read said this would be the right size for me. I t
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Men > Shoes > Athletic > Running > Trail Running
- expected must_quote: ['Sizing seems to be all over the place', 'the sole was longer than my other shoes, but the actual shoe was too short']
- model evidence: ["no bullet points or size chart returned by the scraper", "my foot was swimming in it", "the actual shoe was too short", "I Feel All That It\u2019s Tight On The Front"]
- model owner_line: Add a foot-length size chart today; with none listed, buyers are guessing and getting opposite results.

### r07 (apparel) — cause expected expectation got size_chart
- returns: [{"reason_code": "not_as_described", "size_ordered": "Full Length No Pocket", "comment": "I ordered the yellow but they are super see through. I will be returning them.", "rating": 3, "review_title": "See through"}, {"reason_code": "not_as_described", "size_ordered": "Full Length No Pocket", "comment": "These were super soft. Very good material. The fit was a bit snug. The only con is these were not as dense as I preferred. Meaning you can see through them in the right light.", "rating": 3, "review_title": "Ok"}, {"reason_code": "not_as_described", "size_ordered": "Full Length No Pocket", "com
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Active > Leggings
- expected must_quote: ['they are super see through', 'you can see through them in the right light']
- model evidence: ["fit was a bit snug", "XL I bit too big and long", "Runs big: 3 stars", "the size was labeled wrong"]
- model owner_line: Publish a real waist/hip size chart today since buyers report both snug and too-big-and-long fits with no chart to check against.

### r08 (apparel) — cause expected expectation got garment; evidence not verbatim in inputs
- returns: [{"reason_code": "not_as_described", "size_ordered": "X-Large", "comment": "It's cute but paper thin and see through so I can't wear it out unless layering EVERYTHING. It's soft but just not what I was expecting", "rating": 2, "review_title": "See through and thin material"}, {"reason_code": "not_as_described", "size_ordered": "XX-Large", "comment": "This is not ribbed knitted fabric, it's thin and cheap looking. Definitely not what is in the pictures.", "rating": 1, "review_title": "Not as pictured"}, {"reason_code": "quality", "size_ordered": "Small", "comment": "This sweater dress is just o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['paper thin and see through', 'This is not ribbed knitted fabric']
- model evidence: ["paper thin and see through", "it's thin and cheap looking", "fabric\u2014it's thin, a bit see-through", "Poor quality material, see thru"]
- model owner_line: Fix the fabric weight with your supplier now, since 4 of 5 returns and reviews all call the material thin and see-through.

### r09 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "Small", "comment": "This fit terribly!!! The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight! Terrible. Don\u2019t waste your money.", "rating": 1, "review_title": "Horrible"}, {"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "I wanted to love this sweater dress. The color is nice and the neckline is very attractive. It is the general bagginess and material thinness that I am not happy with. The body is straight and does not lay attractively on my body. It may look good super
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight', 'The sleeves are just way too wide']
- model evidence: ["The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight", "The sleeves are just way too wide", "It runs small. I normally wear between a large and XL", "The underarm/ arms fit a little oversized"]
- model owner_line: Add a size chart with bust, sleeve-opening, and underarm measurements today, since buyers currently have no way to judge the oversized sleeves versus fitted body.

### r10 (shoes) — cause expected fulfilment got garment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "7.5", "comment": "Size was too small and wasn't given the option to exchange like it says. Was told could do refund but they send you a return label that you still have to pay postage. Paid $43 for shoes would cost me over$80 to send shoes back. How does that make sense.", "rating": 1, "review_title": "SCAM???? Don't buy unless you know exactly what size you where in foreign sizes."}, {"reason_code": "damaged", "size_ordered": "7.5", "comment": "It took nearly a month to get these. Tracking was garbage for a while. They didn't come in a box, they
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Shoes > Boots > Ankle & Bootie
- expected must_quote: ['It took nearly a month to get these', "They didn't come in a box, they came bubble wrapped in a bag"]
- model evidence: ["Soles are like crocs, laces cheap, feels like it was made in a toy factory", "Definitely not non slip, kinds easy to slide around on these", "Cute but cheaply made. Not worth $55", "there's definitely also better made shoes out there for the same price"]
- model owner_line: Message your supplier today about the cheap soles, laces and poor grip flagged by two separate buyers.

### r11 (apparel) — cause expected fulfilment got size_chart; evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "The style, color, shape, stitching, length, etc. were all great. However, know this is more Miss sizing vs woman sizing. The XL is more like a women\u2019s 14 vs 16-18 in the waist. I should have read the size chart instead of getting my normal size. They fit everywhere else, but waist was about 4 inches too small.", "rating": 3, "review_title": "Waist runs very small"}, {"reason_code": "doesnt_fit", "size_ordered": "Medium", "comment": "Way too long for petite.", "rating": 3, "review_title": "Too long"}, {"reason_code": "ch
- size_chart: "Inseam of the jeans for women: 30\". GRAPENT tummy control jeans for women run true to standard US sizes. Size X-Small fits size 0 to size 2, Size Small fits size 4 to size 6, Size Medium fits size 8 to size 10, Size Large fits size 12 to size 14, Size X-Large fits size 16 to size 18, Size XX-Large
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['was sent jeans that have been tried on or worn', 'They arrived used and stinky']
- model evidence: ["The XL is more like a women's 14 vs 16-18 in the waist", "I'm 108 pounds and usually a size 0 in other jeans but not even a belt will fix this", "Pant length way too long, and I'm not short, 5'6\"", "Way too long for petite."]
- model owner_line: Replace the dress-size-only chart with real waist/hip/inseam inches today, since buyers on both ends of the size range say it's off.

### r12 (apparel) — no JSON parsed; cause expected expectation got None; evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "4X-Large", "comment": "No, not the correct size in the U.S. 2X is small and 3X is small as well not or barely 1X size", "rating": 1, "review_title": "go to a non online store and try them on...You'll thank me.."}, {"reason_code": "doesnt_fit", "size_ordered": "5X-Large", "comment": "Ordered these in a very big size (4x) intentionally cos I wanted the effortlessly chic slouchy look.. Well...lol the fit was very big and not in a cute way.. They were not soft they were actually kinda stiff.. If they stretched I wouldn't know because I bought these u
- size_chart: "NOTE: The women plus jeans size of S-2XL is a little larger than regular size,so it is recommended to choose a smaller size.The size of 3xl-5xl is a little smaller than the regular size,so it is recommended to choose one size larger.Please refer to the size chart! (Sizing note from the bullets; the
- photos_note: Amazon listing scraped via Apify; 5 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Material is really thin, tears easily', 'The material is thin', 'Thin material']
- model evidence: null
- model owner_line: None

### r13 (apparel) — cause expected size_chart got garment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "20 Plus", "comment": "I like the fit but they are bit tight due to my big thighs. Good durable material and they are comfortable. Nice and thick", "rating": 3, "review_title": "Jeans"}, {"reason_code": "doesnt_fit", "size_ordered": "14 Plus", "comment": "Super cute, extremely comfortable but very short. They come all the way up to your ankles and I\u2019m only 5\u20184\u201c. Additionally, it took over a month for me to get these jeans.", "rating": 3, "review_title": "Cute but not worth the wait"}, {"reason_code": "doesnt_fit", "size_ordered": "1
- size_chart: "Default variant 14 Plus: Inseam Length 27.9 inches; Waist Size 32.2 inches (Amazon 'Product information'). Bullet: Please check our Size Chart Image before placing an order. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['purchased based on measurements and Amazon recommendation', 'used chart and reviews', 'these jeans were comically too big']
- model evidence: ["They run Big!", "were way to big", "ran very big", "stretches out after half a day of wear", "already holes in the thighs"]
- model owner_line: Contact your supplier today about the fabric losing shape and thigh holes, since many different sizes are all coming back as too big or worn through.

### r14 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "Tighter in waste and legs that I expected. No wrinkles, the fabric holds up nice, and I think overall it's worth the money. Just not very happy with the fit. You don't wear these to be warm, they keep you about the same as jeans probably a bit cooler.", "rating": 3, "review_title": "Tighter than expected, otherwise great."}, {"reason_code": "doesnt_fit", "size_ordered": "Large", "comment": "I ordered these based on my usual pant size and they were a mess. The waist ran small while the length width was tight, so I ended up wi
- size_chart: "Default variant Small: Waist Size 30 inches (Amazon 'Product information'). Bullet: check the detailed size chart including multiple inseam options. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 9 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the button already fell off after normal use', 'already got a hole on it after 2 wears', 'The stitches on the side legs are ripping out']
- model evidence: ["Tighter in waste and legs that I expected", "The waist ran small while the length width was tight", "Sizes also run small so go up from what you think you need", "Chart is an image not returned by the scraper."]
- model owner_line: Replace the image-only size chart with real waist/inseam numbers today since three buyers independently said it runs small.

### r15 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "wrong_item", "size_ordered": "34W x 32L", "comment": "So I purchased 5 of these pants in 2 orders. The first one came great, for the 2nd order..which was 4 of the pants..they sent me a white pants instead of the navy blue which was ordered. The white pants was also the incorrect size. All of the others were correct. These fit great and the quality is good. Would have rated 5stars if not for the error.", "rating": 3, "review_title": "Rating would have been higher"}, {"reason_code": "quality", "size_ordered": "36W x 30L", "comment": "Had better luck with other colors. These loo
- size_chart: "Sold as waist x length (e.g. 28W x 30L). Default variant: Waist Size 28 inches, Inseam 30 inches (Amazon 'Product information'). No separate chart text returned."
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['The button was held in place by exactly 4 individual threads', 'The Zipper is horrible', 'at least two sizes smaller']
- model evidence: ["these are not 30\u201d length", "Too tight", "at least two sizes smaller", "No separate chart text returned."]
- model owner_line: Publish a real waist-by-inseam size chart today, since buyers report wrong length and tightness with no numbers to check against.

### r16 (apparel) — cause expected garment got photos
- returns: [{"reason_code": "damaged", "size_ordered": "20 Plus", "comment": "Material nice, flowy , Color perfect. Size good. Only issue had a strong odor of perfume. Im not sure if it woren and tag never removed. I had to wash it twice due to odor and dye.", "rating": 3, "review_title": "Nice Fit"}, {"reason_code": "not_as_described", "size_ordered": "24 Plus", "comment": "No lining. So of course, very see through. Will be returning. I think it's the right length im 5'9\". The 3x fits like a 2x. Stretchy. Just not right.", "rating": 2, "review_title": "Not lined."}, {"reason_code": "quality", "size_ord
- size_chart: "Sizes 14 Plus \u2013 26 Plus. Amazon 'Product information' lists Shoulder to Bottom Hem Length: 12 inches (as scraped). Bullet: check the size chart for exact back-length measurements by size. (Chart is an image not returned by the scraper.)"
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['I trip over the hem often', 'Way too long', 'the dress was made for someone 6’ at least']
- model evidence: ["pattern I received is not the same pattern", "pattern on the material is definitely different from what was pictured in the listing", "First photo is what the pattern is advertised as, second is the actual dress I received"]
- model owner_line: Replace the pattern print photos with true-scale, unfiltered shots today so buyers see the actual print before ordering.

### r17 (apparel) — cause expected expectation got photos
- returns: [{"reason_code": "damaged", "size_ordered": null, "comment": "Cute dress but the bows are not functional to where you can re-tie them and the were sewn on sideways instead of right side up. I ended up just removing them from the dress entirely. Other than that, dress worked out fine for family pictures", "rating": 3, "review_title": "Bows sewn on crooked and not functional", "colour_ordered": "Brown"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "This dress was such a disappointment. It looks so cute in the picture, but the fabric feels extremely cheap for both the dre
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 4 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the fabric feels extremely cheap', 'the material feels like plastic', 'Fabric felt like parachute fabric']
- model evidence: ["Looks nothing like the dress in the picture", "It looks okay in photos but in person it looks so cheap", "It looks so cute in the picture, but the fabric feels extremely cheap"]
- model owner_line: None

### r18 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "This is a good looking suit and seems well made. The color contrast definitely accentuates the curves. It absolutely isn't great for long torso or taller people. I needed something for a vacation and made it work, but I wouldn't have worn it in public. The inserts for the built in bra (and the 'cups/shelf' were well under where my bra should be, but the neckline was high enough that I made it work. There is also no tummy control really. The price is great, so for shorter/regular torso people it should be a great option.", "rating
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 9 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['These are extremely undersized', 'Runs very small. Order larger than you think you need', 'runs really small']
- model evidence: ["These are extremely undersized. I would guess this is Asian sizing unadjusted for US bodies", "Order at least one size up, two for extra length", "Bought a large but should be labeled small", "It absolutely isn't great for long torso or taller people"]
- model owner_line: Publish a real size chart today with size-up and long-torso notes since most returns are sizing complaints, not defects.

### r19 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "Cute but fabric snags very easily.", "rating": 1, "review_title": "Bad fabic"}, {"reason_code": "not_as_described", "size_ordered": null, "comment": "There really is no tummy control at all!! It's a cute suit, top and bottom, but pretty thin around belly area and you see everything :)", "rating": 3, "review_title": "No tummy control :("}, {"reason_code": "changed_mind", "size_ordered": null, "comment": "This bathing suits color was beautiful but the style don\u2019t work for me!", "rating": 2, "review_title": "Cute colors"}, {"reaso
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['fabric snags very easily', 'noticed the material picking', 'the color transfer to other clothes']
- model evidence: ["The size chart went SOLELY on measurements, with no indication of what your usual size would be.", "Runs super small.", "the top was so tight, she couldn't even get it on.", "Way too big."]
- model owner_line: Add a real size chart with body measurements today, since buyers are guessing and getting fit wrong in both directions.

### r20 (apparel) — no JSON parsed; cause expected size_chart got None; evidence not verbatim in inputs
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "(4X) D/DDD", "comment": "I followed the size directions, but it doesn't fit and needs to go back. I got the 4XL Plus. My current bras that fit me well are a 46 band from a reputable company fitted at a reputable store. The 4XL Plus says it is for 46 band size, D to DDD (or F) cup size. I'm an H. I expected the cups to be tight, but I could not find a better sized bra that suited my purpose. I did not expect the band to be so tight I could hardly breathe. The instructions that came with the bra suggested that if you are having difficulty zipping i
- size_chart: "Sizes are sold as letter size + cup range, e.g. (Small) A/C, (Medium) A/C, (XX-Large) D/DDD, (3X) D/DDD, (4X) D/DDD, (5X) D/DDD (variant labels). The numeric band/cup table is an image not returned by the scraper."
- photos_note: Amazon listing scraped via Apify; 7 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Runs way smaller than the size guide claims', 'this one is 1 size off', "I followed the size directions, but it doesn't fit"]
- model evidence: null
- model owner_line: None

### r21 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "not_as_described", "size_ordered": "Medium", "comment": "I purchased this bra in size M in plum (the name of the hot pink colour.) I wear a 36C bra normally, and this sports bra fit me perfectly. The fabric is incredibly soft and comfortable. It has held up well to washing (no shrink, loss of shape, or issues with colour bleeding.) The reason I gave this bra only 3 stars is that it offers very little support, and the cups are not really appropriately sized. I was hoping for a running bra, but this is actually the least supportive of all of the bras and bralettes I own. I deci
- size_chart: "Two charts are shown on the page: 'Original Size Chart' and 'Updated Size Chart' ('fits slightly larger than the old one'; items labeled 'New size' use the updated chart). Both tables are images not returned by the scraper."
- photos_note: Amazon listing scraped via Apify; 7 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['This bra runs VERY SMALL', 'you need to go up a size to have it fit comfortably', 'it fits like a large']
- model evidence: ["This bra runs VERY SMALL!!! I sized up based on other reviews.", "followed the size chart ordering an XL and it fits like a large", "We've introduced a new size chart, which fits slightly larger than the old one", "I recommend sizing up two sizes"]
- model owner_line: Delete the old size chart from the listing today because buyers keep sizing off the wrong one and ordering too small.

### r22 (apparel) — cause expected not_enough_data got size_chart
- returns: [{"reason_code": "quality", "size_ordered": "36A", "comment": "Makes the girls look great and fits well. But does not at all stay where it\u2019s supposed to be and constantly rides up", "rating": 3, "review_title": "Constantly rides up"}, {"reason_code": "quality", "size_ordered": "36B", "comment": "So the overall look of the bra is nice but the \u201cx\u201d design un the front is annoying. I\u2019m guessing they designed it for looks over function because as others have stated it\u2019s uncomfortable. As for quality I think I expected more from a bra in this price point, mostly because I ha
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Runs very small', 'Cups are too big', 'To big and does not conform to my body']
- model evidence: ["Runs very small.", "the cups are too big", "Definitely not true to size", "popping out the top"]
- model owner_line: Add a real size chart with band and cup measurements today, since its absence is causing contradictory small-and-big fit complaints.

### r23 (apparel) — cause expected expectation got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "The bra feels comfortable but it is not meant for small cup sizes. Love the bra. Hate the fit on me. From a 32A.", "rating": 3, "review_title": "Size not accurate"}, {"reason_code": "changed_mind", "size_ordered": null, "comment": "I really wanted to love this bra because it has a lot going for it. It's incredibly comfortable, the sizing is accurate, and it has held up surprisingly well after multiple washes and trips through the dryer. It didn't shrink or lose its shape or color. However, I noticed one very unexpected issue: I s
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the roll up nonstop', 'the strap keeps falling down', 'This does not hold you up in any way']
- model evidence: ["not meant for small cup sizes", "Cups are too big- leaves large gap", "went according to the size chart", "it is the correct size based on the chart"]
- model owner_line: Add a cup-size row to your size chart today, since 4 of 10 returns cite cup fit even when buyers followed the chart.

### r25 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "quality", "size_ordered": "Large", "comment": "I\u2019m so bummed. I bought this hoodie in gray early 2026 and love it so much. It\u2019s the best hoodie I\u2019ve ever owned. High quality and thick and has held up in the wash. Now that the cold weather is back I had to buy the same one in black.. and it\u2019s changed. It\u2019s not the same hoodie. It\u2019s thin and feels cheap. So so sad. I\u2019ll keep it for around the house but wish I bought more of them right after my initial purchase. \ud83d\ude22", "rating": 3, "review_title": "Quality has changed"}, {"reason_code":
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['the color bled after just a couple washes', 'After washing it the color faded even more', 'the neck hole was huge']
- model evidence: ["wasn\u2019t particularly oversized", "the sleeves were longer this hoodie would\u2019ve been perfect", "the neck hole was huge!!!!"]
- model owner_line: Add sleeve-length and neck-opening measurements to the size chart today, since missing numbers are causing sleeve and neck fit complaints.

### r26 (apparel) — cause expected expectation got photos
- returns: [{"reason_code": "not_as_described", "size_ordered": null, "comment": "I like the Tiyomi tops as they are soft and fit well, but this color was called \"teal blue sequin\" and was actually a HUNTER GREEN. There wasn't enough contrast between the top color and sequins so it wasn't as flattering as other designs where the sleeves are more different ... plus I prefer V-neck and this was a crew neck. Unfortunately, I had to return this green one.", "rating": 3, "review_title": "Teal color is actually HUNTER GREEN", "colour_ordered": "#9_ B0_ Teal _ Sequin"}, {"reason_code": "changed_mind", "size_o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 5 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['The shirt is see through', 'It is sheer and shows everything', 'Teal color is actually HUNTER GREEN']
- model evidence: ["was actually a HUNTER GREEN", "darker than advertised", "not as it shows in the advertisement not even close"]
- model owner_line: Reshoot the teal and darker colorways in true daylight today because two buyers say the color arrived noticeably different from photos.

### r27 (apparel) — cause expected expectation got size_chart; evidence not verbatim in inputs
- returns: [{"reason_code": "damaged", "size_ordered": "4X-Large", "comment": "Love the way it looked on me and felt; but it had hole up the side in the seam, where it wasn\u2019t sewn well. I\u2019m just gonna keep and sew it up.", "rating": 3, "review_title": "Liked but had problem"}, {"reason_code": "wrong_item", "size_ordered": "XX-Large", "comment": "Pretty shirt but they sent the wrong size.", "rating": 3, "review_title": "Make sure they send right size"}, {"reason_code": "changed_mind", "size_ordered": "4X-Large", "comment": "This top is pretty and fit ok. It is a tad to clingy for my liking tho."
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 4 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Material is clingy', 'Returned for being too short', 'I do wish the length was as described']
- model evidence: ["was too big on me, even though I ordered suggested size", "Fit like a maternity shirt", "Returned for being too short. Shouldn't be sold as a \"tunic\"", "I do wish the length was as described"]
- model owner_line: Add a size chart with bust and length measurements today, since four returns cite wrong fit or wrong length and none exists.

### r28 (shoes) — cause expected garment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "7 Toddler", "comment": "Not for wide feet. Very cute and a good price, but I was unable to get them on my son's wide feet. Sizing is also off - size down.", "rating": 3, "review_title": "Not for wide feet and sizing is off"}, {"reason_code": "quality", "size_ordered": "3 Little Kid", "comment": "These shoes cut into my ankle and it hurt to walk. I only took about 10 steps and my ankles are bright red. They hurt my ankles in socks as well. I am returning them.", "rating": 1, "review_title": "Hurt to walk in"}, {"reason_code": "doesnt_fit", "size_o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['run very large', 'These shoes are huge for my son', 'size runs big']
- model evidence: ["We recommend ordering one size smaller for the best fit", "size runs big", "SO BIG", "run very large"]
- model owner_line: Publish an actual size chart with foot-length numbers today, since the missing chart is driving most of these ten fit-related returns.

### r29 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Beautiful but the fit was not it. The material was decent quality.", "rating": 3, "review_title": "Runs smaller than what it should.", "colour_ordered": "Celadon"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Super cute but way too tight & short on the bottom. I liked everything else about it though. Ultimately I decided to return it.", "rating": 1, "review_title": "Cute but not what I expected", "colour_ordered": "White"}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "Stiff fabric. Fit is of
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['too big on top and too small on the bottom', 'way too tight & short on the bottom', 'Ran small had to send back']
- model evidence: ["Runs smaller than what it should.", "too big on top and too small on the bottom", "Ran small had to send back", "I sized up for length. True to size."]
- model owner_line: Add a real garment measurement chart today since buyers with no chart are guessing and returning for fit in both directions.

### r30 (shoes) — cause expected not_enough_data got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "8 Toddler", "comment": "Sizing chart is pretty inaccurate. Order the toddler size 8 and they are significantly larger than a size 8", "rating": 3, "review_title": "Sizing inaccurate"}, {"reason_code": "doesnt_fit", "size_ordered": "8 Toddler", "comment": "Insanely large. Ordered 8 toddler for my kid who is this size in other brands. At least two sizes too big ??? Quality seems fine, style as pictured, and lightweight", "rating": 2, "review_title": "WAY too big"}, {"reason_code": "quality", "size_ordered": "7 Big Kid", "comment": "These snowboots 
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; bullets and Amazon 'Product information' returned by the product-details actor; Amazon's size-chart table is an image/popup not returned by either a
- expected must_quote: ['Sizing chart is pretty inaccurate', 'At least two sizes too big']
- model evidence: ["Sizing chart is pretty inaccurate", "significantly larger than a size 8", "At least two sizes too big"]
- model owner_line: Add a real size chart today noting the boots run large, since two of three returns were oversized toddler 8s.
