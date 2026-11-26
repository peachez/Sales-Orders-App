/**
 * Order Tracker backend - paste this into Extensions > Apps Script
 * from inside your Google Sheet, then Deploy > New deployment > Web app.
 *
 * Execute as: Me      Who has access: Anyone
 *
 * Set SECRET below to any long random string and enter the same value in the app.
 */
const SECRET = 'MAKE-YOUR-OWN-SECRET-STRING-HERE';
const SHEET_NAME = 'Orders';
const BASE_COLUMNS = ['id', 'createdAt', 'updatedAt'];

function doGet(e) {
  return handle_(() => {
    auth_(e.parameter.token);
    if (e.parameter.action !== 'list') throw new Error('Unknown action');
    return { orders: readAll_() };
  });
}

function doPost(e) {
  return handle_(() => {
    const body = JSON.parse(e.postData.contents);
    auth_(body.token);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (body.action === 'add') return { order: add_(body.order) };
      if (body.action === 'update') return { order: update_(body.order) };
      if (body.action === 'delete') return remove_(body.id);
      throw new Error('Unknown action');
    } finally {
      lock.releaseLock();
    }
  });
}

function handle_(fn) {
  let out;
  try {
    out = Object.assign({ ok: true }, fn());
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function auth_(token) {
  if (!token || token !== SECRET) throw new Error('Invalid access token');
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, BASE_COLUMNS.length).setValues([BASE_COLUMNS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

// Adds a column for any key the sheet doesn't have yet, so new app fields just work.
function ensureColumns_(sh, keys) {
  const headers = headers_(sh);
  const missing = keys.filter((k) => headers.indexOf(k) === -1);
  if (missing.length) {
    sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  }
  return headers.concat(missing);
}

function readAll_() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const headers = headers_(sh);
  const rows = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return rows
    .map((r) => {
      const o = {};
      headers.forEach((h, i) => {
        const v = r[i];
        o[h] = v instanceof Date ? v.toISOString() : v;
      });
      return o;
    })
    .filter((o) => o.id !== '');
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function rowFrom_(headers, order) {
  return headers.map((h) => (order[h] === undefined || order[h] === null ? '' : order[h]));
}

function add_(order) {
  const sh = sheet_();
  const now = new Date().toISOString();
  const rec = Object.assign({}, order, { id: Utilities.getUuid(), createdAt: now, updatedAt: now });
  const headers = ensureColumns_(sh, Object.keys(rec));
  sh.appendRow(rowFrom_(headers, rec));
  return rec;
}

function update_(order) {
  const sh = sheet_();
  const row = findRow_(sh, order.id);
  if (row === -1) throw new Error('Order not found');
  const headers = ensureColumns_(sh, Object.keys(order));
  const existing = sh.getRange(row, 1, 1, headers.length).getValues()[0];
  const merged = {};
  headers.forEach((h, i) => (merged[h] = existing[i]));
  Object.keys(order).forEach((k) => {
    if (k !== 'id' && k !== 'createdAt') merged[k] = order[k];
  });
  merged.updatedAt = new Date().toISOString();
  sh.getRange(row, 1, 1, headers.length).setValues([rowFrom_(headers, merged)]);
  return merged;
}

function remove_(id) {
  const sh = sheet_();
  const row = findRow_(sh, id);
  if (row === -1) throw new Error('Order not found');
  sh.deleteRow(row);
  return {};
}
