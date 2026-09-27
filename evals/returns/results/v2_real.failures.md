# Failure report for v2

Summary: {"version": "v2", "model": "sonnet", "n": 10, "cause_accuracy": 0.4, "parsed_rate": 1.0, "grounded_rate": 1.0, "low_data_ok_rate": 0.0, "fix_rate": 1.0, "owner_line_rate": 1.0, "mean_latency_s": 48.9, "hard_subset_accuracy": 0.4, "gate_met": false}

## Confusion (expected -> got: count)
{
 "garment": {
  "garment": 2,
  "size_chart": 1
 },
 "not_enough_data": {
  "garment": 1,
  "size_chart": 1
 },
 "size_chart": {
  "size_chart": 1
 },
 "expectation": {
  "size_chart": 1,
  "expectation": 1,
  "garment": 1
 },
 "fulfilment": {
  "garment": 1
 }
}

## Failed cases
### r02 (apparel) — cause expected not_enough_data got garment
- returns: [{"reason_code": "damaged", "size_ordered": "Medium", "comment": "The dress was nice with a good fit. My husband and I both loved it. I do see how the peal straps feel weak but my issue and the reason I returned it is that the side was all scratched up as though someone had snagged their jewelry in the side repeatedly and it smelled like body odor. Could not get the dress off of me fast enough. Amazon needs to put some big tags on the outside or something because it\u2019s a big issue of people returning clothing that has been worn.", "rating": 3, "review_title": "Was sent a used item"}, {"rea
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Club & Night Out
- expected must_quote: ['my pearl straps didnt come with 2', 'it smelled like body odor']
- model evidence: ["the peal straps feel weak", "didnt come with 2!! I got one", "the pearl straps keep sliding down", "I had to replace them because I felt like the dress was falling off"]
- model owner_line: Email your supplier today about the pearl straps - 3 of 5 returns report weak, missing, or slipping straps.

### r04 (apparel) — cause expected expectation got size_chart
- returns: [{"reason_code": "quality", "size_ordered": null, "comment": "The color and size are nice. The fabric is thin and cheap looking and the price reflects that. It shows every curve of your body so be prepared to wear shapewear underneath. I added a cardigan over it and it worked fine.", "rating": 3, "review_title": "Quality reflected in the price."}, {"reason_code": "doesnt_fit", "size_ordered": null, "comment": "I love the color of the dress. It is just a little too clingy for my body. Boo hoo... it is beautiful.", "rating": 3, "review_title": "Beautiful dress"}, {"reason_code": "doesnt_fit", "s
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Sweaters > Pullovers
- expected must_quote: ['The fabric is thin and cheap looking', 'Fit well but is see through']
- model evidence: ["too clingy for my body", "made for skinny girls", "shows every curve of your body"]
- model owner_line: Add a real size chart today so buyers with fuller or fuller-curved bodies can size up before ordering, not after.

### r06 (shoes) — cause expected not_enough_data got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "10.5", "comment": "The one thing that I absolutely know, is what shoe size I wear in several brands and I am very consistent. When I first began to wear Altra running shoes, both the company and the runner that told me about them said I should go up a half size from my normal tennis shoe size. I always wore a 10 wide so I went to a 10.5 altra and they fit perfect! Since 2017 I have worn nothing but 10.5 Altra Olympus tennis shoes. So I purchased the Nortiv 8 in a 10.5 as well since every review I read said this would be the right size for me. I t
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Men > Shoes > Athletic > Running > Trail Running
- expected must_quote: ['Sizing seems to be all over the place', 'the sole was longer than my other shoes, but the actual shoe was too short']
- model evidence: ["my foot was swimming in it", "sole was longer than my other shoes, but the actual shoe was too short", "Sizing seems to be all over the place!", "Fitting however, should improve."]
- model owner_line: Add a real foot-length size chart today since none exists and five buyers got wildly different fits guessing their size.

### r08 (apparel) — cause expected expectation got garment
- returns: [{"reason_code": "not_as_described", "size_ordered": "X-Large", "comment": "It's cute but paper thin and see through so I can't wear it out unless layering EVERYTHING. It's soft but just not what I was expecting", "rating": 2, "review_title": "See through and thin material"}, {"reason_code": "not_as_described", "size_ordered": "XX-Large", "comment": "This is not ribbed knitted fabric, it's thin and cheap looking. Definitely not what is in the pictures.", "rating": 1, "review_title": "Not as pictured"}, {"reason_code": "quality", "size_ordered": "Small", "comment": "This sweater dress is just o
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['paper thin and see through', 'This is not ribbed knitted fabric']
- model evidence: ["it's thin and cheap looking", "paper thin and see through", "Poor quality material, see thru", "Material is very thin", "not good: bad quality"]
- model owner_line: Contact your supplier today to thicken the knit fabric, since 5 of 5 returns cite thin, see-through material regardless of size.

### r09 (apparel) — cause expected garment got size_chart
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "Small", "comment": "This fit terribly!!! The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight! Terrible. Don\u2019t waste your money.", "rating": 1, "review_title": "Horrible"}, {"reason_code": "doesnt_fit", "size_ordered": "X-Large", "comment": "I wanted to love this sweater dress. The color is nice and the neckline is very attractive. It is the general bagginess and material thinness that I am not happy with. The body is straight and does not lay attractively on my body. It may look good super
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 6 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Clothing > Dresses > Casual
- expected must_quote: ['The sleeves were humongous and so was the area near the armpit, but the rest of the dress was skin tight', 'The sleeves are just way too wide']
- model evidence: ["The sleeves were humongous", "sleeves are just way too wide", "It runs small", "the general bagginess"]
- model owner_line: Publish a size chart with bust, waist, and underarm/sleeve width today, since missing measurements are driving these fit returns.

### r10 (shoes) — cause expected fulfilment got garment
- returns: [{"reason_code": "doesnt_fit", "size_ordered": "7.5", "comment": "Size was too small and wasn't given the option to exchange like it says. Was told could do refund but they send you a return label that you still have to pay postage. Paid $43 for shoes would cost me over$80 to send shoes back. How does that make sense.", "rating": 1, "review_title": "SCAM???? Don't buy unless you know exactly what size you where in foreign sizes."}, {"reason_code": "damaged", "size_ordered": "7.5", "comment": "It took nearly a month to get these. Tracking was garbage for a while. They didn't come in a box, they
- size_chart: null
- photos_note: Amazon listing scraped via Apify; 7 gallery images; no bullet points or size chart returned by the scraper. Breadcrumb: Clothing, Shoes & Jewelry > Women > Shoes > Boots > Ankle & Bootie
- expected must_quote: ['It took nearly a month to get these', "They didn't come in a box, they came bubble wrapped in a bag"]
- model evidence: ["Soles are like crocs, laces cheap, feels like it was made in a toy factory", "there's definitely also better made shoes out there for the same price", "Cute but cheaply made. Not worth $55", "Definitely not non slip, kinds easy to slide around on these"]
- model owner_line: Message your supplier today about the cheap soles, laces, and grip issues before you get more quality-based returns.
