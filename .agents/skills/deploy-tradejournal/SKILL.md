---
name: deploy-tradejournal
description: Step-by-step deployment workflow for TradeJournal, including pre-flight checks, client build to public_html, git push, and Namecheap remote restart via ssh aceddivision.
---

# Deploy TradeJournal

Use this skill whenever you need to deploy TradeJournal to production on the East Division Namecheap server.

## Deployment Workflow

Follow these exact steps in order when the user asks you to deploy or run the build process:

1. **Pre-flight Safety Check & Build**:
   - Run backend syntax check: `node --check server/src/index.js` to ensure the server will not crash on boot.
   - Run syntax checks across all backend files:
     `Get-ChildItem -Path "server/src" -Filter "*.js" -Recurse | ForEach-Object { node --check $_.FullName }`
   - Build client if frontend changes exist:
     `npm run build --prefix client` (compiles into `public_html`).
   - **CRITICAL**: If any check or build fails, HALT the deployment immediately. Do not push. Fix the errors before proceeding.
2. **Commit & Push**:
   - Check git status and stage all changes (including updated `public_html` assets): `git add -A`.
   - Commit the latest changes: `git commit -m "<message>"`.
   - Run `git push origin main`.
3. **Deploy to Namecheap (East Division / aceddivision)**:
   - Run SSH command to pull and restart the app on the remote server via configured `aceddivision` SSH alias:
     `ssh -o BatchMode=yes aceddivision "source /home/acedzagz/nodevenv/tradeJournal/server/20/bin/activate && cd /home/acedzagz/tradeJournal && PREV_REV=\$(git rev-parse HEAD) && git pull origin main && NEW_REV=\$(git rev-parse HEAD) && if git diff --name-only \$PREV_REV \$NEW_REV | grep -q 'server/package'; then echo \"Dependencies changed, running npm ci in server...\"; cd server && npm ci --omit=dev && cd ..; fi && touch /home/acedzagz/tradeJournal/server/tmp/restart.txt"`
4. **Verify**:
   - Verify health endpoint: `curl.exe -s https://thetradejournal.aceddivision.com/health`
   - Verify live endpoint responds: `curl.exe -I -s https://thetradejournal.aceddivision.com`
   - Confirm to the user that the app has been safely checked, pushed, pulled, and restarted remotely.
