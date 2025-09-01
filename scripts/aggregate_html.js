const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || path.join(__dirname, '..', '30.06.2025 TO 31.07.2025.html');

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function toNumber(s) {
  if (!s) return 0;
  const cleaned = stripTags(s).replace(/[,\s]/g, '');
  if (cleaned === '' ) return 0;
  const n = Number(cleaned);
  if (Number.isFinite(n)) return n;
  // try to extract digits
  const m = cleaned.match(/-?[0-9]+(?:\.[0-9]+)?/);
  return m ? Number(m[0]) : 0;
}

function inferShift(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Unknown';
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'Morning';
  if (h >= 14 && h < 22) return 'Afternoon';
  return 'Night';
}

const html = fs.readFileSync(filePath, 'utf8');

// get all rows
const trRe = /<tr[\s\S]*?>[\s\S]*?<\/tr>/gi;
const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;

const rows = html.match(trRe) || [];
if (rows.length === 0) {
  console.error('No <tr> rows found');
  process.exit(1);
}

// first row with header cells (xl65) usually has headers
let headerRow = null;
for (const r of rows) {
  if (r.includes('xl65')) { headerRow = r; break; }
}
if (!headerRow) headerRow = rows[0];

const headers = [];
let m;
while ((m = tdRe.exec(headerRow)) !== null) {
  headers.push(stripTags(m[1]));
}

if (headers.length === 0) {
  console.error('No headers found');
  process.exit(1);
}

// find indexes
function idxOfAny(names) {
  for (const n of names) {
    const i = headers.findIndex(h => h.toLowerCase().includes(n.toLowerCase()));
    if (i >= 0) return i;
  }
  return -1;
}

const iWDate = idxOfAny(['W Date Time','w date time','date time','w date']);
const iSite = idxOfAny(['Site Name','site name','site']);
const iUser = idxOfAny(['User Full Name','user full name','user']);

const idxAmountDue = idxOfAny(['Amount Due','amount due']);
const idxGvmFine = idxOfAny(['GVM Fine','gvm fine']);
const idxD1Fine = idxOfAny(['D1 Fine','d1 fine']);
const idxD2Fine = idxOfAny(['D2 Fine','d2 fine']);
const idxD3Fine = idxOfAny(['D3 Fine','d3 fine']);
const idxD4Fine = idxOfAny(['D4 Fine','d4 fine']);
const idxAwk = idxOfAny(['Awkward Load Fine','awkward load fine']);
const idxAmtDriver = idxOfAny(['Amount Due Driver','amount due driver']);

const aggregatesByPerson = {};
const aggregatesBySite = {};
const aggregatesByShift = {};
let overallTotal = 0;
let totalRows = 0;

// process data rows (rows after headerRow)
let started = false;
for (const r of rows) {
  if (!started) {
    if (r === headerRow) { started = true; }
    continue;
  }
  // skip if it's still header-like
  // extract tds
  const cells = [];
  tdRe.lastIndex = 0;
  while ((m = tdRe.exec(r)) !== null) {
    cells.push(m[1]);
  }
  if (cells.length < 3) continue;

  totalRows++;
  const wDateRaw = cells[iWDate] ? stripTags(cells[iWDate]) : '';
  // try to parse date formats like '6/30/2025 12:13:17 AM' into ISO
  let parsedDate = new Date(wDateRaw);
  if (isNaN(parsedDate)) {
    // try Excel serial format inside x:num? already stripped so likely human readable
    parsedDate = new Date(wDateRaw);
  }

  const shift = inferShift(wDateRaw);
  const site = cells[iSite] ? stripTags(cells[iSite]) : 'Unknown';
  const user = cells[iUser] ? stripTags(cells[iUser]) : 'Unknown';

  const amountDue = toNumber(cells[idxAmountDue]);
  const gvmFine = toNumber(cells[idxGvmFine]);
  const d1Fine = toNumber(cells[idxD1Fine]);
  const d2Fine = toNumber(cells[idxD2Fine]);
  const d3Fine = toNumber(cells[idxD3Fine]);
  const d4Fine = toNumber(cells[idxD4Fine]);
  const awkFine = toNumber(cells[idxAwk]);
  const amtDriver = toNumber(cells[idxAmtDriver]);

  const rowTotal = amountDue + gvmFine + d1Fine + d2Fine + d3Fine + d4Fine + awkFine + amtDriver;

  overallTotal += rowTotal;

  // person
  const nameKey = user || 'Unknown';
  if (!aggregatesByPerson[nameKey]) aggregatesByPerson[nameKey] = { total: 0, count: 0 };
  aggregatesByPerson[nameKey].total += rowTotal;
  aggregatesByPerson[nameKey].count += 1;

  // site
  const siteKey = site || 'Unknown';
  if (!aggregatesBySite[siteKey]) aggregatesBySite[siteKey] = { total: 0, count: 0 };
  aggregatesBySite[siteKey].total += rowTotal;
  aggregatesBySite[siteKey].count += 1;

  // shift
  const shiftKey = shift || 'Unknown';
  if (!aggregatesByShift[shiftKey]) aggregatesByShift[shiftKey] = { total: 0, count: 0 };
  aggregatesByShift[shiftKey].total += rowTotal;
  aggregatesByShift[shiftKey].count += 1;
}

// prepare output
function sortObjDesc(obj) {
  return Object.entries(obj).sort((a,b)=> b[1].total - a[1].total).map(([k,v])=> ({ key:k, total:v.total, count:v.count }));
}

const out = {
  metadata: {
    rowsProcessed: totalRows,
    headersCount: headers.length,
    inferredIndexes: {
      WDate: iWDate,
      Site: iSite,
      User: iUser,
      AmountDue: idxAmountDue,
      GVMFine: idxGvmFine,
      D1Fine: idxD1Fine,
      D2Fine: idxD2Fine,
      D3Fine: idxD3Fine,
      D4Fine: idxD4Fine,
      AwkwardFine: idxAwk,
      AmountDueDriver: idxAmtDriver
    }
  },
  overallTotal,
  byPerson: sortObjDesc(aggregatesByPerson),
  bySite: sortObjDesc(aggregatesBySite),
  byShift: sortObjDesc(aggregatesByShift)
};

console.log(JSON.stringify(out, null, 2));

// also print a concise text summary
console.log('\n=== Summary ===');
console.log('Rows processed:', totalRows);
console.log('Overall revenue total:', overallTotal.toFixed(2));
console.log('\nTop 10 persons by revenue:');
out.byPerson.slice(0,10).forEach((p,i)=> console.log(`${i+1}. ${p.key} — ${p.total.toFixed(2)} (${p.count} rows)`));
console.log('\nTop sites:');
out.bySite.slice(0,10).forEach((p,i)=> console.log(`${i+1}. ${p.key} — ${p.total.toFixed(2)} (${p.count} rows)`));
console.log('\nRevenue by shift:');
out.byShift.forEach(s=> console.log(`${s.key} — ${s.total.toFixed(2)} (${s.count} rows)`));

process.exit(0);
