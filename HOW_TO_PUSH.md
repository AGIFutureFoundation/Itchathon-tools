# Push this to github.com/AGIFutureFoundation/Itchathon-tools

1. Unzip. The folder already contains the full git history and the remote.
2. In a terminal, inside the unzipped `returns-rootcause` folder:

    git push -u origin main

   If asked to log in: `gh auth login --web` (GitHub CLI) or use a personal access token as the password.
3. Wiki (optional): `bash tools/publish-wiki.sh`
4. Create `.env` from `.env.example` and add your APIFY_TOKEN for the ASIN import.
5. Run: `node app/server.js` → http://localhost:3141
