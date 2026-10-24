# Wholesale Email → Deals Sheet

A Google Apps Script automation (it runs on Google Cloud under your Google account) that:

1. Every 5 minutes, checks the Gmail label **`.WHOLESALE PORTAL`** for new emails.
2. Sends each new email to **Gemini**, which pulls out the property's street address, unit, city, state, zip, asking price, pictures link, the person who sent it, and their company.
3. Skips the deal if its zip code isn't on the **zip code sheet**.
4. Checks the street address with **Google** to confirm it's a real address. The unit number is never sent for this check.
5. Adds a row to the **deals sheet** with these columns:
   `Date Sent | Email | Company | Individual | Street Address | Unit Number | City | State | Zip | Pictures Link`

Unit numbers are cleaned before they're written, so only the number and its letters are kept: `UNIT A320` → `A320`, `Apt #2-B` → `2B`, `Ste. 100` → `100`.

## Setup (about 10 minutes)

1. Go to <https://script.google.com> and click **New project**. Sign in with the Gmail account that has the label. Name the project something like "Wholesale Deal Intake".
2. Replace the contents of `Code.gs` with [`Code.gs`](Code.gs) from this folder.
3. Click **Project Settings** (the gear icon) and check **Show "appsscript.json" manifest file in editor**. Then go back to the editor and replace that file with [`appsscript.json`](appsscript.json). If you aren't in US Eastern time, change `timeZone`.
4. In **Project Settings → Script Properties**, add:

   | Property | Value |
   |---|---|
   | `GEMINI_API_KEY` | your Gemini API key |
   | `DEALS_SHEET_ID` | `12aIo0maV2qzEylH6nOfJYR-8O9aEUqlE-BywcDZcOlQ` |
   | `ZIP_SHEET_ID` | `1rHgOJRoZXMY8KurJvYwzsEBZ4JIjid6fzJX7TkKGGM8` |
   | `MAPS_API_KEY` | *(optional, recommended)* see "Address verification" below |
   | `GEMINI_MODEL` | *(optional)* defaults to `gemini-2.5-flash` |

5. In the editor, choose the **`setup`** function and click **Run**. Approve the permissions it asks for (Gmail read-only, Sheets, external requests, triggers). This creates the 5-minute trigger, and from then on it processes emails that arrive after this moment.
6. *(Optional)* To process emails already in the label, run **`backfill`**. By default it covers the last 7 days. To cover more, run `backfill(30)` from a scratch function.

Your API keys are stored only in Script Properties. They never go in the code or in this repository.

## Address verification

- **With `MAPS_API_KEY` (recommended):** uses Google's [Address Validation API](https://developers.google.com/maps/documentation/address-validation), which is built to confirm that an address really exists. To get a key: in Google Cloud Console, open **APIs & Services**, enable **Address Validation API**, then go to **Credentials → Create credentials → API key**. Restrict the key to that API. An address passes when Google confirms it down to the building (`PREMISE`, `SUB_PREMISE`, or `PREMISE_PROXIMITY`).
- **Without it:** uses the geocoder built into Apps Script. It needs no key, but it's less strict. An address passes when Google returns an exact street-address match that isn't a partial match.

If the email has no zip, the zip that Google returns during verification is used for the zip filter.

## Notes

- **Zip sheet:** every 5-digit zip found in any cell of the first tab is allowed. Zips that Sheets stored as numbers and that lost their leading zero (`2134`) are handled.
- **Deals sheet:** rows are added to the first tab (`gid=0`). Put the 10 headers in row 1 in the order shown above.
- **Skipped emails** (no address, zip not on the list, address not verified) are recorded in **Executions** in the Apps Script editor, along with the reason.
- **Failures:** if Gemini is down or rate-limited, the run stops, and the same email is tried again 5 minutes later. No email is lost.
- **Price** is extracted. The sheet has no Price column yet, though. To record it, add a column and add `deal.price` to the `appendRow` call in `processMessage_`.
- **Gemini key types:** keys that start with `AQ.` (Vertex AI express mode) are sent to the Vertex AI endpoint, and `AIza…` keys go to the Gemini Developer API. If one endpoint rejects the key, the script tries the other.
