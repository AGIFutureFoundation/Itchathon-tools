#!/usr/bin/env zsh
# Builds media/judging-demo.mp4 (110s, narrated for hackathon judges) from the clips
# tools/record-judging.js recorded. Answers: problem/impact, technical depth, working
# demo, honesty/rigor, business viability -- the categories any judge checks.
#   node tools/record-judging.js && bash tools/make-judging-video.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=media/raw-judging; mkdir -p "$RAW"

typeset -A NARR; NARR=(
 dashboard "Sapient.X, powered by AGI Corp. Judging criterion one: does this hit a real, weekly pain. A seller above twenty percent returns reads every one by hand. A shift lead guesses prep every morning. An owner pays an agency and can't tell what it bought. A shop loses ten dollars at a time with no one able to act in the moment. Four weekly pains, on one dashboard, each turned into one action."
 returns "Why did it come back: paste a listing, its size chart, the returns you already have. Claude names one cause and quotes the buyer's own words as proof, checked by code, with a fix ready to paste. This removes the actual weekly job -- reading returns one at a time -- not just a piece of it. Sixty labelled cases, ninety-two percent accuracy, this version, v six, live right now."
 prep "Judging criterion two: how easy is this to adopt. No new software. Paste the POS export you already have, pick whether you'd rather run out or waste, and get one number per item in under a second -- thirty percent better than the habit it replaces. A busy owner could start this next week with a file they already have."
 ads "Same criterion, harder case. Paste your ad campaign export -- the same file you'd send an agency. A hundred thirty-five impressions, zero conversions, against one twenty-two and two: any plain calculator calls that a winner. This does not. It says so, and names what to change instead, in English, no dashboard login, no new account."
 theft "Judging criterion three: cost and return. Sizing tools start near seventeen hundred dollars a month. Agencies run thirty-five hundred. Each module here is priced to undercut that by an order of magnitude, and it shows the saving directly: this ad panel alone catches six hundred forty dollars a month being burned on a campaign with zero leads."
 judging "The honest part: on real Amazon reviews with no size chart, accuracy was forty percent lower than on clean test cases -- we show that gap, we don't hide it, and three prompt versions were rejected before one finally beat it fairly. Every answer is redacted, guarded, audited and gated before an owner sees it. Real pain, removed weekly. Set up with files an owner already has. A clear price against a clear saving. That's the case for Sapient.X."
)
ORDER=(dashboard returns prep ads theft judging)

for s in "${ORDER[@]}"; do
  say -v Samantha -r 225 -o "$RAW/$s.aiff" "${NARR[$s]}"
  ffmpeg -y -loglevel error -i "$RAW/$s.aiff" -ar 44100 -ac 2 "$RAW/$s.m4a"
  vd=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW/$s.webm")
  ad=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW/$s.m4a")
  case $s in dashboard) cap=13;; returns) cap=27;; prep) cap=13;; ads) cap=15;; theft) cap=18;; judging) cap=21;; esac
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
