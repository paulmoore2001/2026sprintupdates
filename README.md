# Start Garden 100 — 60 Day Sprint Update

A small static website with one update page per founder in the Start Garden 100. Each founder sees their own stated milestone and metrics from the application, and submits a short update on each plus a status. Every submission is added as a new row in a Google Sheet.

**How it's built:**
- `index.html` — roster page listing all 50 founders, each linking to their own page
- `founder.html` — the update page template. It reads `?id=<slug>` from the URL and loads that founder's data from `founders.json`. One template serves all 50 founders — each still gets a distinct, shareable link (see `founder-links.csv`)
- `founders.json` — the 50 founders' names, companies, milestones, and metrics, pulled from `Top_50_Sprint_Statements_2026.xlsx`
- `app.js` / `style.css` / `config.js` — page logic, styling, and the one setting you need to fill in
- `Code.gs` — the Google Apps Script that receives submissions and writes them to your Sheet
- `founder-links.csv` — every founder's individual link in one file, for sending out

No server, database, or hosting account is required beyond a place to put static files and a Google account.

---

## Step 1 — Create the Google Sheet

1. Create a new Google Sheet (sheets.new). Name it something like **Start Garden 100 — Sprint Responses**.
2. That's it for now — the script in Step 2 creates the `Responses` tab and header row automatically the first time someone submits.

## Step 2 — Add the Apps Script and deploy it

1. In the Sheet, go to **Extensions > Apps Script**.
2. Delete any starter code in `Code.gs`, and paste in the contents of this project's `Code.gs`.
3. Click **Deploy > New deployment**.
4. Next to "Select type," click the gear icon and choose **Web app**.
5. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**, and authorize it when Google prompts you (it'll warn that the app isn't verified — that's expected for a script you wrote yourself; click through **Advanced > Go to [project name]**).
7. Copy the **Web app URL** it gives you. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

You can visit that URL directly in a browser — it should show `{"status":"ok","message":"Start Garden sprint update endpoint is live."}`. If it shows an error instead, redo the deploy step and make sure "Who has access" is set to Anyone.

**If you ever edit `Code.gs` later:** you must create a **new deployment version** (Deploy > Manage deployments > edit (pencil) > New version) for the changes to go live — saving the script alone isn't enough.

## Step 3 — Connect the website to the script

Open `config.js` and replace the placeholder with the URL from Step 2:

```js
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec"
};
```

## Step 4 — Put the files online

This is a static site — five files that need to be served from somewhere with a URL. Two easy free options:

**GitHub Pages**
1. Create a new GitHub repo and upload everything in this folder except `Code.gs` and `founder-links.csv` (those two are for you, not the browser).
2. In the repo, go to **Settings > Pages**, set the source to your main branch, and save.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

**Netlify Drop**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag this folder in (again, everything except `Code.gs` and `founder-links.csv`).
2. Netlify gives you a live URL immediately.

Either way, each founder's link will be:
`https://<your-site>/founder.html?id=<their-slug>`

## Step 5 — Send founders their links

Open `founder-links.csv` — it has each founder's name, company, and the exact link to send them (as a mail-merge source, or just copy/paste). The roster page at `index.html` also lists everyone and links out, in case you'd rather send one shared link and let people find their own name.

---

## Where the data ends up

Every submission appends a row to the **Responses** tab in your Sheet:

| Timestamp | Founder Name | Company Name | Milestone (original) | Milestone update | Stated Metrics (original) | Metrics update | Sprint status | Slug |

Founders can submit more than once (e.g. to correct something) — each submission is its own row, so the most recent row for a given founder is their latest update.

## If you need to regenerate founders.json

If the spreadsheet changes (names, milestones, etc.), re-run this against the source `.xlsx` to rebuild `founders.json` (requires `openpyxl`):

```python
import openpyxl, json, re

wb = openpyxl.load_workbook('Top_50_Sprint_Statements_2026.xlsx', data_only=True)
ws = wb['Top 50 Sprints']

def slugify(name):
    s = re.sub(r'[^a-z0-9]+', '-', name.lower().strip())
    return re.sub(r'-+', '-', s).strip('-')

founders, seen = [], {}
for row in ws.iter_rows(min_row=3, values_only=True):
    company, founder, desc, milestone, metrics = row[0], row[1], row[2], row[3], row[4]
    if not company:
        continue
    slug = base = slugify(founder or company)
    n = 2
    while slug in seen:
        slug = f'{base}-{n}'; n += 1
    seen[slug] = True
    founders.append({'slug': slug, 'founderName': (founder or '').strip(),
                      'companyName': (company or '').strip(),
                      'milestone': (milestone or '').strip(),
                      'metrics': (metrics or '').strip()})

json.dump(founders, open('founders.json', 'w'), indent=2)
```

Note: the slugs this generates must match the ones already sent out to founders, or their old links will break — safest to only re-run this before links go out, not after.
