// Backend API adapter that keeps the same interface as the former IndexedDB wrapper
// It proxies calls to the Node/Express server while preserving method names used across the app.
import api from './api';

function normalizeIso(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return String(dateStr);
    return d.toISOString();
  } catch {
    return String(dateStr);
  }
}

class WeighbridgeAPI {
  constructor() {
    this.ready = false;
  }

  async init() {
    try {
      await api.overview().catch(() => api.users.list()); // ping any endpoint
      this.ready = true;
    } catch (e) {
      this.ready = false;
      throw e;
    }
  }

  // People operations
  async addPerson(name, group = '', shift = '') {
    const res = await api.people.create(name, group || undefined, shift || undefined);
    return res.id;
  }

  async updatePerson(id, updates) {
    const payload = {};
    if ('group' in updates) payload.group = updates.group || null;
    if ('shift' in updates) payload.shift = updates.shift || null;
    await api.people.update(id, payload);
    return id;
  }

  async deletePerson(id) {
    // Not used currently; could add delete endpoint if needed
    throw new Error('deletePerson not supported by API');
  }

  async getAllPeople() {
    // Return shape: { id, name, group, shift, ... }
    return api.people.list();
  }

  async getPeopleByGroup(group) {
    const all = await this.getAllPeople();
    return all.filter(p => (p.group || '') === group);
  }

  async getPeopleByShift(shift) {
    const all = await this.getAllPeople();
    return all.filter(p => (p.shift || '') === shift);
  }

  async findPersonByName(name) {
    const people = await this.getAllPeople();
    return people.find(p => p.name.toLowerCase() === String(name).toLowerCase()) || null;
  }

  async addPersonIfNotExists(name, group = '', shift = '') {
    const existing = await this.findPersonByName(name);
    if (existing) {
      const updates = {};
      if (group && group !== existing.group) updates.group = group;
      if (shift && shift !== existing.shift) updates.shift = shift;
      if (Object.keys(updates).length) await this.updatePerson(existing.id, updates);
      return existing.id;
    }
    return this.addPerson(name, group, shift);
  }

  async getDuplicateNamesSummary(excelRows) {
    const nameCounts = {};
    const duplicates = [];
    (excelRows || []).forEach(row => {
      if (row.person) {
        const name = String(row.person).trim();
        nameCounts[name] = (nameCounts[name] || 0) + 1;
      }
    });
    Object.entries(nameCounts).forEach(([name, count]) => {
      if (count > 1) duplicates.push({ name, count });
    });
    return {
      totalUniqueNames: Object.keys(nameCounts).length,
      totalNameOccurrences: Object.values(nameCounts).reduce((a,b)=>a+b,0),
      duplicateNames: duplicates.sort((a,b)=>b.count - a.count),
      hasDuplicates: duplicates.length > 0,
    };
  }

  // Groups operations
  async addGroup(name) {
    const res = await api.groups.create(name);
    return res.id;
  }
  async getAllGroups() { return api.groups.list(); }
  async deleteGroup(id) { await api.groups.delete(id); }

  // Shifts operations
  async addShift(name) { const res = await api.shifts.create(name); return res.id; }
  async getAllShifts() { return api.shifts.list(); }
  async deleteShift(id) { await api.shifts.delete(id); }

  // Excel data operations -> bulk insert to backend
  async saveExcelData(data) {
    const rows = (data || []).map(r => ({
      w_datetime: normalizeIso(r.date),
      site: r.site || r.siteName || undefined, // may be undefined in Excel rows
      user_full_name: r.person || undefined,   // treat the Excel person as officer name
      person_name: r.person || undefined,      // also set as person for mapping
      amount_due: r.amountDue ?? undefined,
      gvm_fine: r.gvmFine ?? undefined,
      d1_fine: r.d1Fine ?? undefined,
      d2_fine: r.d2Fine ?? undefined,
      d3_fine: r.d3Fine ?? undefined,
      d4_fine: r.d4Fine ?? undefined,
      awkward_load_fine: r.awkwardLoadFine ?? undefined,
      amount_due_driver: r.amountDueDriver ?? undefined,
      total_revenue: r.totalRevenue ?? undefined,
    }));
    const payload = { source_filename: 'excel-upload', rows };
    return api.bulkInsert(payload);
  }

  async getLatestExcelData() {
    // Not needed by UI currently; return null to maintain signature
    return null;
  }

  // Utility methods (not supported in backend; no-ops to preserve interface)
  async clearAllData() {
    throw new Error('clearAllData not supported by API');
  }

  async exportAllData() {
    const [people, groups, shifts, overview] = await Promise.all([
      this.getAllPeople(), this.getAllGroups(), this.getAllShifts(), api.overview()
    ]);
    return {
      metadata: { exportedAt: new Date().toISOString(), version: '1.0', database: 'WeighbridgeAPI' },
      people, groups, shifts, excelData: { summary: overview }
    };
  }
}

const db = new WeighbridgeAPI();
export default db;
