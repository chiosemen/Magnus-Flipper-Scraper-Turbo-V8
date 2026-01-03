<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15yEs1C09qgHemGGTipLUkRoI2gGF_bN3

## Mixtape Scope

Production targets for the Mixtape release:
- `apps/web` (dashboard)
- `apps/api` (API + orchestration)
- `apps/worker` (job execution)

The root SPA (repo root `App.tsx`, `pages/`, `components/`, `services/`) is legacy and out-of-scope for Mixtape shipping. Root SPA build/runtime errors are non-blocking for Mixtape deploys.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
