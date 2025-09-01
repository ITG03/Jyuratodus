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
      // Revenue fields
      amountDue: parseFloat(row['Amount Due'] || row[headerMap.amountDue] || 0),
      gvmFine: parseFloat(row['GVM Fine'] || row[headerMap.gvmFine] || 0),
      d1Fine: parseFloat(row['D1 Fine'] || row[headerMap.d1Fine] || 0),
      d2Fine: parseFloat(row['D2 Fine'] || row[headerMap.d2Fine] || 0),
      d3Fine: parseFloat(row['D3 Fine'] || row[headerMap.d3Fine] || 0),
      d4Fine: parseFloat(row['D4 Fine'] || row[headerMap.d4Fine] || 0),
      awkwardLoadFine: parseFloat(row['Awkward Load Fine'] || row[headerMap.awkwardLoadFine] || 0),
      amountDueDriver: parseFloat(row['Amount Due Driver'] || row[headerMap.amountDueDriver] || 0),
      totalRevenue: calculateTotalRevenue(row, headerMap),
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
    // Revenue field mappings
    amountDue: find('amount due', 'total due', 'amount owed', 'total owed'),
    gvmFine: find('gvm fine', 'gross vehicle mass fine'),
    d1Fine: find('d1 fine', 'd1fine'),
    d2Fine: find('d2 fine', 'd2fine'),
    d3Fine: find('d3 fine', 'd3fine'),
    d4Fine: find('d4 fine', 'd4fine'),
    awkwardLoadFine: find('awkward load fine', 'awkward fine'),
    amountDueDriver: find('amount due driver', 'driver amount', 'driver fine'),
  };
}

function calculateTotalRevenue(row, headerMap) {
  const amountDue = parseFloat(row['Amount Due'] || row[headerMap.amountDue] || 0);
  const gvmFine = parseFloat(row['GVM Fine'] || row[headerMap.gvmFine] || 0);
  const d1Fine = parseFloat(row['D1 Fine'] || row[headerMap.d1Fine] || 0);
  const d2Fine = parseFloat(row['D2 Fine'] || row[headerMap.d2Fine] || 0);
  const d3Fine = parseFloat(row['D3 Fine'] || row[headerMap.d3Fine] || 0);
  const d4Fine = parseFloat(row['D4 Fine'] || row[headerMap.d4Fine] || 0);
  const awkwardLoadFine = parseFloat(row['Awkward Load Fine'] || row[headerMap.awkwardLoadFine] || 0);
  const amountDueDriver = parseFloat(row['Amount Due Driver'] || row[headerMap.amountDueDriver] || 0);
  
  return amountDue + gvmFine + d1Fine + d2Fine + d3Fine + d4Fine + awkwardLoadFine + amountDueDriver;
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


