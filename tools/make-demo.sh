#!/usr/bin/env zsh
# Builds media/demo.mp4 (90s, narrated) and media/demo.gif from the clips tools/record.js recorded.
#   bash tools/make-demo.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=media/raw; mkdir -p "$RAW"

# 1. Narration: one line per scene, macOS `say` (no external service, no cost).
typeset -A NARR; NARR=(
 dashboard "This is Owner Console. Four things a small business already detects, turned into one action each, for an owner working alone. The dashboard says what to do today: which listing needs a new size chart, how much to prep, whether an ad test is real, where stock is walking out."
 returns "Why did it come back. Paste a listing, its size chart and the returns. Claude reads the buyers' own words and names one cause: photos, size chart, garment, expectation or fulfilment. Every quote is checked by code against the input. The fix is ready to paste, and the keep-size message replaces the phone calls Ben used to make. On sixty labelled cases, prompt version two scored ninety-eight percent, up from seventy-eight, after one loop of the meta-prompt."
 prep "Today's prep. Same-weekday median over eight weeks, adjusted for trend, weather and bookings. The owner picks which way they would rather be wrong. One number per item, in under a second, and a seven a.m. card. It beats same-day-last-week by thirty percent on pinball loss."
 ads "Ads plain read. One thirty-five impressions and zero conversions against one twenty-two and two: a significance calculator called a winner. We do not. No winner yet, two hundred conversions per variant needed, and then, what to change anyway, in plain words."
 theft "Ten seconds after. The camera already found the thief. This gives the person alone in the shop the sentence to say, on the speaker, with a countdown, and logs the outcome to harden the shelf next month. Rules only, never confrontation. Every answer is redacted before the model, guarded after, audited with its prompt version, and gated by evals."
)
ORDER=(dashboard returns prep ads theft)

for s in "${ORDER[@]}"; do
  say -v Samantha -r 215 -o "$RAW/$s.aiff" "${NARR[$s]}"
  ffmpeg -y -loglevel error -i "$RAW/$s.aiff" -ar 44100 -ac 2 "$RAW/$s.m4a"
  vd=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW/$s.webm")
  ad=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$RAW/$s.m4a")
  # Scene length = the longer of clip and narration, so nothing is cut mid-sentence.
  case $s in dashboard) cap=14;; returns) cap=26;; prep) cap=14;; ads) cap=15;; theft) cap=18;; esac
  dur=$(python3 -c "print(min(max(float('$vd'), float('$ad')+0.4), $cap))")
  ffmpeg -y -loglevel error -i "$RAW/$s.webm" -i "$RAW/$s.m4a" \
    -filter_complex "[0:v]scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2,tpad=stop_mode=clone:stop_duration=60,trim=0:$dur,setpts=PTS-STARTPTS[v];[1:a]apad,atrim=0:$dur,asetpts=PTS-STARTPTS[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 128k -r 30 "$RAW/$s.scene.mp4"
  echo "scene $s: video ${vd}s, narration ${ad}s -> ${dur}s"
done

# 2. Title card (3s): an HTML card screenshotted with Playwright (this ffmpeg build has no drawtext).
cat > "$RAW/title.html" <<'HTML'
<body style="margin:0;width:1280px;height:800px;background:#0B1220;display:grid;place-content:center;text-align:center;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#fff">
<div style="font-size:78px;font-weight:700;letter-spacing:-1px">Owner Console</div>
<div style="font-size:30px;color:#9FB3C8;margin-top:18px">Detection is solved. The next step is not.</div>
<div style="font-size:20px;color:#5E7186;margin-top:40px">ITCHATHON 2026 · AGI Future Foundation</div></body>
HTML
node -e "const {chromium}=require('./tools/node_modules/playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});await p.goto('file://'+process.cwd()+'/$RAW/title.html');await p.screenshot({path:'$RAW/title.png'});await b.close();})()"
ffmpeg -y -loglevel error -loop 1 -i "$RAW/title.png" -f lavfi -i "anullsrc=r=44100:cl=stereo" -t 3 -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -shortest "$RAW/title.mp4"
printf "file 'title.mp4'\n" > "$RAW/list.txt"
for s in "${ORDER[@]}"; do printf "file '%s.scene.mp4'\n" "$s" >> "$RAW/list.txt"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$RAW/list.txt" -c copy media/demo.mp4
ffmpeg -y -loglevel error -i media/demo.mp4 -vf "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer" -t 60 media/demo.gif
ffprobe -v error -show_entries format=duration -of csv=p=0 media/demo.mp4 | xargs -I{} echo "media/demo.mp4 = {}s"; ls -la media/demo.mp4 media/demo.gif
