import * as XLSX from 'xlsx';

export async function parseExcelFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

  // Try to normalize known columns. Users can rename headers; use fuzzy matching.
  const headerMap = buildHeaderMap(json[0] || {});

  const rows = json.map((row) => {
    return {
      person: pickFirstNonEmpty(row['User Full Name'], row[headerMap.person], row['Operator'], row['Person'], row['Name']),
      group: '',
      shift: '',
      impounded: normalizeBool(
        row['In Detention'] ?? row[headerMap.impounded] ?? row['Impounded']
      ),
      date: row[headerMap.date] || row['Date'] || row['Datetime'] || '',
      truckId: row[headerMap.truck] || row['Truck'] || row['Truck No'] || row['Truck ID'] || '',
      _raw: row,
    };
  });

  return rows;
}

function buildHeaderMap(sample) {
  const keys = Object.keys(sample || {}).map(k => String(k).toLowerCase());
  function find(...candidates) {
    const lower = keys;
    for (const c of candidates) {
      const idx = lower.findIndex(k => k.includes(c));
      if (idx >= 0) return Object.keys(sample)[idx];
    }
    return undefined;
  }
  return {
    person: find('user full name', 'full name', 'operator', 'person', 'name', 'weighed by', 'user'),
    impounded: find('in detention', 'detention', 'impound', 'seized', 'held'),
    date: find('date', 'time'),
    truck: find('truck', 'vehicle', 'plate'),
  };
}

function normalizeBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value || '').trim().toLowerCase();
  if (s === 'yes' || s === 'true' || s === '1' || s === 'y') return true;
  return false;
}

function pickFirstNonEmpty(...values) {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (s.trim().length > 0) return v;
  }
  return '';
}


