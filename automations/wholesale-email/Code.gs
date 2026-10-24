/**
 * Wholesale deal intake
 *
 * Watches the Gmail label ".WHOLESALE PORTAL", sends each new email to Gemini to
 * extract the property details, keeps only deals whose zip is in the target zip
 * sheet, verifies the street address with Google, and appends a row to the deals
 * sheet.
 *
 * Configuration lives in Script Properties (Project Settings > Script Properties),
 * never in this file:
 *   GEMINI_API_KEY  (required) Gemini / Vertex AI API key
 *   DEALS_SHEET_ID  (required) spreadsheet that receives the rows
 *   ZIP_SHEET_ID    (required) spreadsheet holding the allowed zip codes
 *   MAPS_API_KEY    (optional) key with the Address Validation API enabled; when
 *                   absent the built-in Apps Script geocoder is used instead
 *   GEMINI_MODEL    (optional) defaults to gemini-2.5-flash
 *
 * Run setup() once to install the 5-minute trigger.
 */

const LABEL_NAME = '.WHOLESALE PORTAL';
const DEALS_SHEET_GID = 0;
const ZIP_SHEET_GID = 0;
const DEFAULT_MODEL = 'gemini-2.5-flash';
const WATERMARK_KEY = 'LAST_PROCESSED_MS';
const MAX_THREADS_PER_RUN = 50;
const MAX_BODY_CHARS = 30000;

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Installs the time-driven trigger and starts watching from now. Run once. */
function setup() {
  getConfig_(); // fail early if properties are missing
  getLabel_();

  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'processNewWholesaleEmails')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('processNewWholesaleEmails').timeBased().everyMinutes(5).create();

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(WATERMARK_KEY)) {
    props.setProperty(WATERMARK_KEY, String(Date.now()));
  }
  console.log('Trigger installed. Watching "%s" for emails after %s.',
    LABEL_NAME, new Date(Number(props.getProperty(WATERMARK_KEY))));
}

/** Re-processes emails in the label received in the last N days (default 7). */
function backfill(days) {
  const n = Number(days) || 7;
  PropertiesService.getScriptProperties()
    .setProperty(WATERMARK_KEY, String(Date.now() - n * 24 * 60 * 60 * 1000));
  processNewWholesaleEmails();
}

/** Trigger handler: processes every labeled message newer than the watermark. */
function processNewWholesaleEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return; // a previous run is still going

  try {
    const config = getConfig_();
    const props = PropertiesService.getScriptProperties();
    const watermark = Number(props.getProperty(WATERMARK_KEY)) || Date.now();

    const messages = getLabel_().getThreads(0, MAX_THREADS_PER_RUN)
      .reduce((all, thread) => all.concat(thread.getMessages()), [])
      .filter(m => m.getDate().getTime() > watermark)
      .sort((a, b) => a.getDate() - b.getDate());

    if (!messages.length) return;

    const allowedZips = loadAllowedZips_(config.zipSheetId);
    const dealsSheet = getSheetByGid_(config.dealsSheetId, DEALS_SHEET_GID);

    for (const message of messages) {
      // Errors here (e.g. Gemini outage) stop the run without advancing the
      // watermark, so the message is retried on the next run.
      processMessage_(message, config, allowedZips, dealsSheet);
      props.setProperty(WATERMARK_KEY, String(message.getDate().getTime()));
    }
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function processMessage_(message, config, allowedZips, dealsSheet) {
  const subject = message.getSubject();
  const sender = parseSender_(message.getFrom());
  const deal = extractDeal_(message, config);

  if (!deal.streetAddress) {
    console.log('Skipped "%s": no property address found.', subject);
    return;
  }

  let zip = normalizeZip_(deal.zip);
  let verification = null;

  // Without a zip we can't filter yet, so verify first and use Google's zip.
  if (!zip) {
    verification = verifyAddress_(deal, config);
    zip = verification.zip;
  }
  if (!zip || !allowedZips.has(zip)) {
    console.log('Skipped "%s": zip %s is not in the target list.', subject, zip || '(none)');
    return;
  }

  verification = verification || verifyAddress_(deal, config);
  if (!verification.valid) {
    console.log('Skipped "%s": address could not be verified (%s, %s, %s %s).',
      subject, deal.streetAddress, deal.city, deal.state, zip);
    return;
  }

  dealsSheet.appendRow([
    message.getDate(),
    sender.email,
    deal.company || 'Unknown',
    deal.individual || 'Unknown',
    deal.streetAddress,
    cleanUnit_(deal.unit),
    deal.city || verification.city || '',
    (deal.state || verification.state || '').toUpperCase(),
    zip,
    isUrl_(deal.picturesLink) ? deal.picturesLink : '',
  ]);
  console.log('Added %s, %s %s from "%s".', deal.streetAddress, deal.city, zip, subject);
}

// ---------------------------------------------------------------------------
// Gemini extraction
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are reading an email that advertises a wholesale real estate property for sale.
Extract the following and return JSON only.

- streetAddress: house number and street name only (e.g. "123 Main St"). Do NOT include the unit, city, state, or zip.
- unit: the unit/apartment/suite number exactly as written (e.g. "Unit A320", "#4", "Apt 2B"). Empty string if none.
- city, state (2-letter abbreviation), zip (5 digits): of the property.
- price: the asking price the seller is advertising, as written (e.g. "$185,000"). Empty string if none.
- picturesLink: the URL of a link to pictures/photos of the property (often Google Drive, Dropbox, Google Photos, or a link labeled "Pictures"/"Photos"). Empty string if the email has no pictures link. Never invent one.
- individual: the full name of the person who sent the deal (check the signature and From header). "Unknown" if not found.
- company: the name of the company that sent the deal (check the signature, logo text, footer, and sender domain). "Unknown" if not found.

Describe the property being sold, not the sender's office address. If several properties are listed, use the first one.
If a field is not present, return an empty string (or "Unknown" for individual/company). Do not guess.`;

const EXTRACTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    streetAddress: { type: 'STRING' },
    unit: { type: 'STRING' },
    city: { type: 'STRING' },
    state: { type: 'STRING' },
    zip: { type: 'STRING' },
    price: { type: 'STRING' },
    picturesLink: { type: 'STRING' },
    individual: { type: 'STRING' },
    company: { type: 'STRING' },
  },
  required: ['streetAddress', 'unit', 'city', 'state', 'zip', 'price',
    'picturesLink', 'individual', 'company'],
};

function extractDeal_(message, config) {
  const emailText = [
    'From: ' + message.getFrom(),
    'Subject: ' + message.getSubject(),
    'Date: ' + message.getDate(),
    '',
    'Body:',
    message.getPlainBody(),
    '',
    'Links in the email (anchor text -> URL):',
    extractLinks_(message.getBody()).join('\n') || '(none)',
  ].join('\n').slice(0, MAX_BODY_CHARS);

  const payload = {
    contents: [{ role: 'user', parts: [{ text: EXTRACTION_PROMPT + '\n\n---\n\n' + emailText }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: EXTRACTION_SCHEMA,
    },
  };

  const response = callGemini_(payload, config);
  const text = response.candidates[0].content.parts.map(p => p.text || '').join('');
  const deal = JSON.parse(text);
  Object.keys(deal).forEach(k => { deal[k] = String(deal[k] || '').trim(); });
  return deal;
}

/**
 * Calls the Gemini API. Keys starting with "AQ." are Vertex AI express-mode keys,
 * which use the aiplatform endpoint; other keys use the Gemini Developer API.
 * If the first endpoint rejects the key, the other one is tried.
 */
function callGemini_(payload, config) {
  const key = config.geminiKey;
  const model = config.model;
  const endpoints = [
    'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=',
    'https://aiplatform.googleapis.com/v1/publishers/google/models/' + model + ':generateContent?key=',
  ];
  if (key.indexOf('AQ.') === 0) endpoints.reverse();

  let lastError;
  for (const base of endpoints) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = UrlFetchApp.fetch(base + encodeURIComponent(key), {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      const code = res.getResponseCode();
      if (code === 200) return JSON.parse(res.getContentText());
      lastError = 'Gemini HTTP ' + code + ': ' + res.getContentText().slice(0, 500);
      if (code === 429 || code >= 500) {
        Utilities.sleep(2000 * Math.pow(2, attempt));
        continue;
      }
      break; // auth / bad request: try the other endpoint
    }
  }
  throw new Error(lastError);
}

// ---------------------------------------------------------------------------
// Address verification (unit number is never sent)
// ---------------------------------------------------------------------------

function verifyAddress_(deal, config) {
  return config.mapsKey
    ? verifyWithAddressValidation_(deal, config.mapsKey)
    : verifyWithGeocoder_(deal);
}

function verifyWithAddressValidation_(deal, mapsKey) {
  const res = UrlFetchApp.fetch(
    'https://addressvalidation.googleapis.com/v1:validateAddress?key=' + encodeURIComponent(mapsKey),
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        address: {
          regionCode: 'US',
          addressLines: [deal.streetAddress],
          locality: deal.city,
          administrativeArea: deal.state,
          postalCode: deal.zip,
        },
      }),
      muteHttpExceptions: true,
    });
  if (res.getResponseCode() !== 200) {
    throw new Error('Address Validation HTTP ' + res.getResponseCode() + ': ' +
      res.getContentText().slice(0, 500));
  }

  const result = JSON.parse(res.getContentText()).result || {};
  const verdict = result.verdict || {};
  const postal = (result.address && result.address.postalAddress) || {};
  const granularity = verdict.validationGranularity;
  return {
    valid: ['PREMISE', 'SUB_PREMISE', 'PREMISE_PROXIMITY'].indexOf(granularity) !== -1,
    zip: normalizeZip_(postal.postalCode),
    city: postal.locality || '',
    state: postal.administrativeArea || '',
  };
}

function verifyWithGeocoder_(deal) {
  const query = [deal.streetAddress, deal.city, deal.state, deal.zip].filter(Boolean).join(', ');
  const response = Maps.newGeocoder().setRegion('us').geocode(query);
  const best = response.status === 'OK' && response.results[0];
  if (!best) return { valid: false, zip: '', city: '', state: '' };

  const component = type => {
    const c = best.address_components.find(ac => ac.types.indexOf(type) !== -1);
    return c ? c.short_name : '';
  };
  const precise = best.types.some(t => ['street_address', 'premise', 'subpremise'].indexOf(t) !== -1);
  return {
    valid: precise && !best.partial_match,
    zip: normalizeZip_(component('postal_code')),
    city: component('locality'),
    state: component('administrative_area_level_1'),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConfig_() {
  const p = PropertiesService.getScriptProperties();
  const config = {
    geminiKey: p.getProperty('GEMINI_API_KEY'),
    dealsSheetId: p.getProperty('DEALS_SHEET_ID'),
    zipSheetId: p.getProperty('ZIP_SHEET_ID'),
    mapsKey: p.getProperty('MAPS_API_KEY'),
    model: p.getProperty('GEMINI_MODEL') || DEFAULT_MODEL,
  };
  ['geminiKey', 'dealsSheetId', 'zipSheetId'].forEach(k => {
    if (!config[k]) throw new Error('Missing Script Property for ' + k + ' (see README).');
  });
  return config;
}

function getLabel_() {
  const label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) throw new Error('Gmail label "' + LABEL_NAME + '" not found.');
  return label;
}

function getSheetByGid_(spreadsheetId, gid) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  return ss.getSheets().find(s => s.getSheetId() === gid) || ss.getSheets()[0];
}

/** Every 5-digit zip found anywhere on the zip sheet. */
function loadAllowedZips_(spreadsheetId) {
  const zips = new Set();
  getSheetByGid_(spreadsheetId, ZIP_SHEET_GID).getDataRange().getValues().forEach(row => {
    row.forEach(cell => {
      const zip = normalizeZip_(cell);
      if (zip) zips.add(zip);
    });
  });
  return zips;
}

/** "02134-1234", 2134 (number with lost leading zero), " 02134 " -> "02134". */
function normalizeZip_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 && value < 100000 ? String(value).padStart(5, '0') : '';
  }
  const match = String(value).trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : '';
}

/** "UNIT A320" -> "A320", "Apt #2-B" -> "2B", "Ste. 100" -> "100". */
function cleanUnit_(unit) {
  return String(unit || '')
    .toUpperCase()
    .replace(/\b(APARTMENT|APT|UNIT|SUITE|STE|NUMBER|NUM|NO|BLDG|BUILDING|FLOOR|FL|RM|ROOM|LOT|SPACE|SPC)\b\.?/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

function parseSender_(from) {
  const match = String(from).match(/<([^>]+)>/);
  return { email: (match ? match[1] : String(from)).trim().toLowerCase() };
}

function extractLinks_(html) {
  const links = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html || '')) && links.length < 100) {
    const url = m[1].replace(/&amp;/g, '&');
    if (!isUrl_(url)) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    links.push((text || '(no text)') + ' -> ' + url);
  }
  return links;
}

function isUrl_(value) {
  return /^https?:\/\/\S+$/i.test(String(value || '').trim());
}
