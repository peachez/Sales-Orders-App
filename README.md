# Order Tracker

A phone-friendly React app that stores orders in a Google Sheet. No Google Cloud project or OAuth: a small Google Apps Script attached to your sheet acts as the API.

## 1. Set up the Google Sheet backend (5 minutes)

1. Create a new Google Sheet (any name).
2. **Extensions → Apps Script**. Delete the starter code and paste in `apps-script/Code.gs`.
3. Change `SECRET` at the top to a long random string. Remember it.
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorize when prompted, then copy the **Web App URL** (ends in `/exec`).

The script creates an `Orders` tab with headers automatically on first use.

> Whenever you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the URL keeps working.

## 2. Run the app

```bash
npm install
npm run dev        # prints a Network URL you can open on your phone (same Wi-Fi)
```

Open the app, go to **Settings**, paste the Web App URL and secret, tap **Test connection**.

Optional: copy `.env.example` to `.env` to pre-fill those values at build time.

## 3. Put it on your phone for real

```bash
npm run build
```

Upload the `dist/` folder to any static host (Netlify Drop, Cloudflare Pages, GitHub Pages; `base: './'` is already set). Open the URL on your phone and use **Share → Add to Home Screen** for an app-like icon.

## Adding fields later

Edit the `FIELDS` list in `src/fields.js`. Each entry becomes a form input and a sheet column. The Apps Script adds any missing column header automatically the first time an order with that field is saved. Old rows simply stay blank for the new column.

Fields you can use: `text`, `tel`, `number`, `money`, `select` (with `options`), `textarea`, `date`.

## Security note

Anyone with the Web App URL *and* the secret can read/write your sheet. The secret is typed on each device and stored in that browser's local storage only. If you ever need to rotate it, change `SECRET` in Apps Script, deploy a new version, and update Settings. Don't commit a `.env` with real values.
