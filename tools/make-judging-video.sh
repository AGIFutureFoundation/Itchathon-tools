#!/usr/bin/env zsh
# Builds media/judging-demo.mp4 (110s, narrated for hackathon judges) from the clips
# tools/record-judging.js recorded. Answers: problem/impact, technical depth, working
# demo, honesty/rigor, business viability -- the categories any judge checks.
#   node tools/record-judging.js && bash tools/make-judging-video.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=media/raw-judging; mkdir -p "$RAW"

typeset -A NARR; NARR=(
 dashboard "Sapient.X, powered by AGI Corp. Criterion one: real, weekly pain. A seller reads every return by hand. A shift lead guesses prep each morning. An owner can't tell what the agency bought. A shop loses money with no one able to act in the moment. Four weekly pains, one dashboard, one action each."
 returns "Why did it come back: paste the listing, the size chart, the returns you already have. Claude names one cause and quotes the buyer's own words as proof, checked by code. Ninety-two percent accuracy on sixty labelled cases -- this is v six, live now, and it replaces the actual weekly job, not a piece of it."
 prep "Criterion two: ease of adoption. No new software -- paste the POS export you already have, pick run-out or waste, get one number per item in under a second. Thirty percent better than the habit. An owner could start next week."
 ads "Paste your ad export, the same file you'd send an agency. A hundred thirty-five impressions, zero conversions, against one twenty-two and two: a plain calculator calls that a winner. This doesn't -- it says so, and names what to change, in English."
 theft "Criterion three: cost and return. Sizing tools run near seventeen hundred a month, agencies thirty-five hundred. Sapient.X undercuts that by an order of magnitude, and shows the saving directly -- six hundred forty dollars a month caught here, burning on zero leads."
 judging "The honest part: on real reviews with no size chart, accuracy dropped forty points, and we show that, we don't hide it. Three prompt versions were rejected before one beat it fairly. Every answer is redacted, guarded, and gated first. Real pain, removed weekly, at a price with the saving spelled out. That's Sapient.X."
)
ORDER=(dashboard returns prep ads theft judging)

for s in "${ORDER[@]}"; do
  say -v Samantha -r 225 -o "$RAW/$s.aiff" "${NARR[$s]}"
  ffmpeg -y -loglevel error -i "$RAW/$s.aiff" -ar 44100 -ac 2 "$RAW/$s.m4a"
  vd=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW/$s.webm")
  ad=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW/$s.m4a")
  case $s in dashboard) cap=10;; returns) cap=19;; prep) cap=10;; ads) cap=12;; theft) cap=14;; judging) cap=16;; esac
  dur=$(python3 -c "print(min(max(float('$vd'), float('$ad')+0.4), $cap))")
  ffmpeg -y -loglevel error -i "$RAW/$s.webm" -i "$RAW/$s.m4a" \
    -filter_complex "[0:v]scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2,tpad=stop_mode=clone:stop_duration=60,trim=0:$dur,setpts=PTS-STARTPTS[v];[1:a]apad,atrim=0:$dur,asetpts=PTS-STARTPTS[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -r 30 "$RAW/$s.scene.mp4"
  echo "scene $s: video ${vd}s, narration ${ad}s -> ${dur}s"
done

# Title card (3s)
cat > "$RAW/title.html" <<'HTML'
<body style="margin:0;width:1280px;height:800px;background:#0B1220;display:grid;place-content:center;text-align:center;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#fff">
<div style="font-size:70px;font-weight:700;letter-spacing:-1px">Sapient.X</div>
<div style="font-size:26px;color:#9FB3C8;margin-top:16px">Detection is solved. The next step is not.</div>
<div style="font-size:20px;color:#9FB3C8;margin-top:6px">Powered by AGI Corp</div>
<div style="font-size:18px;color:#5E7186;margin-top:36px">ITCHATHON 2026 · Judging submission</div></body>
HTML
node -e "const {chromium}=require('./tools/node_modules/playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});await p.goto('file://'+process.cwd()+'/$RAW/title.html');await p.screenshot({path:'$RAW/title.png'});await b.close();})()"
ffmpeg -y -loglevel error -loop 1 -i "$RAW/title.png" -f lavfi -i "anullsrc=r=44100:cl=stereo" -t 3 -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest "$RAW/title.mp4"
printf "file 'title.mp4'\n" > "$RAW/list.txt"
for s in "${ORDER[@]}"; do printf "file '%s.scene.mp4'\n" "$s" >> "$RAW/list.txt"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$RAW/list.txt" -c copy media/judging-demo.mp4
ffmpeg -y -loglevel error -i media/judging-demo.mp4 -vf "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer" -t 60 media/judging-demo.gif
ffprobe -v error -show_entries format=duration -of csv=p=0 media/judging-demo.mp4 | xargs -I{} echo "media/judging-demo.mp4 = {}s"
ls -la media/judging-demo.mp4 media/judging-demo.gif
