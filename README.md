# DRT — Data Reconciliation Tool

## React + Vite + TypeScript — browser-only

DRT runs entirely in the browser. CSV/XLSX files are selected from the user's device, processed locally in the browser, and Excel reports are downloaded by the browser. No backend server, Electron runtime, or file-upload service is used.

## Features

- Source and destination CSV/XLSX upload
- Multiple key mapping and manual column mapping
- Mapping and KB workbook import
- General Equal and KB Doc comparison
- Match, difference, missing, destination-only, and duplicate-key reporting
- Searchable results and Excel report download
- Locally saved mapping configurations

## Local development

Node.js 20+ is recommended.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in your browser.

## Cloudflare deployment

Build the site with:

```bash
npm run build
```

Configure Cloudflare Pages or Workers Builds as follows:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist/renderer` |
| Node.js version | `20` or later |

Connect the GitHub repository in Cloudflare. Every push to the production branch will trigger a deployment. The included `wrangler.jsonc` also supports static-asset deployment through Cloudflare Workers Builds.

## Browser limitations

Saved configurations retain mappings and comparison settings in browser local storage, but browsers cannot retain access to local files. Re-select the source and destination files after loading a saved configuration.

## Mapping workbook format

| Source Column | Destination Column |
| --- | --- |
| CG Stage | WNS Stage |
| CG Industry | WNS Industry |

The same workbook can include KB rules using `Source Value` and `Destination Value` columns.
