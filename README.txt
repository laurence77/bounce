bounce-classic-standalone

Requirements
- Node 18+ (LTS) recommended

Install
1) npm install

Develop
1) npm run dev
2) Open the URL that esbuild prints (default: http://localhost:8000)

Build (production)
1) npm run build
2) Serve the "public" folder with any static server (e.g. `npx serve public`)

Deploy (GitHub Pages via Actions)
1) Create a repo on GitHub and push this project to the `main` branch.
2) In GitHub → Settings → Pages, set Source to "GitHub Actions".
3) On push to `main`, the workflow `.github/workflows/pages.yml` builds and deploys `public/`.
4) Your site will be published at https://<your-username>.github.io/<repo-name>/

Mobile (Capacitor)
1) npm i @capacitor/core @capacitor/cli
2) npx cap init bounce-classic com.example.bounce --web-dir=public
3) npx cap add ios   # optional
4) npx cap add android   # optional
5) npm run build && npx cap sync

Notes
- This repo is standalone by design, no shared core.
- Replace placeholder visuals with your own sprites and tiles.
