// Supabase-backed database adapter keeping the same interface used by the app
import { supabase } from './supabaseClient';

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

class SupabaseWeighbridgeDB {
  constructor() { this.ready = false; }

  async init() {
    const { error } = await supabase.from('groups').select('id').limit(1);
    if (error) throw error;
    this.ready = true;
    return true;
  }

  // People
  async addPerson(name, group = '', shift = '') {
    const { data, error } = await supabase
      .from('people')
      .insert({ name: String(name).trim(), group: group || '', shift: shift || '' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async updatePerson(id, updates) {
    const payload = {};
    if ('group' in updates) payload.group = updates.group || '';
    if ('shift' in updates) payload.shift = updates.shift || '';
    const { error } = await supabase.from('people').update(payload).eq('id', id);
    if (error) throw error;
    return id;
  }

  async deletePerson(id) {
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async getAllPeople() {
    const { data, error } = await supabase
      .from('people')
      .select('id,name,group,shift,created_at,updated_at')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async getPeopleByGroup(group) {
    const { data, error } = await supabase
      .from('people')
      .select('id,name,group,shift')
      .eq('group', group || '');
    if (error) throw error;
    return data || [];
  }

  async getPeopleByShift(shift) {
    const { data, error } = await supabase
      .from('people')
      .select('id,name,group,shift')
      .eq('shift', shift || '');
    if (error) throw error;
    return data || [];
  }

  async findPersonByName(name) {
    const n = String(name || '').trim();
    if (!n) return null;
    const { data, error } = await supabase
      .from('people')
      .select('id,name,group,shift')
      .ilike('name', n);
    if (error) throw error;
    return (data || []).find(p => p.name.toLowerCase() === n.toLowerCase()) || null;
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
        const nm = String(row.person).trim();
        nameCounts[nm] = (nameCounts[nm] || 0) + 1;
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

  // Groups
  async addGroup(name) {
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: String(name).trim() })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async getAllGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('id,name,created_at')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async deleteGroup(id) {
    const { data: g, error: ge } = await supabase
      .from('groups')
      .select('name')
      .eq('id', id)
      .single();
    if (ge) throw ge;
    const groupName = g?.name || '';
    if (groupName) {
      await supabase.from('people').update({ group: '' }).eq('group', groupName);
    }
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Shifts
  async addShift(name) {
    const { data, error } = await supabase
      .from('shifts')
      .insert({ name: String(name).trim() })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async getAllShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('id,name,created_at')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async deleteShift(id) {
    const { data: s, error: se } = await supabase
      .from('shifts')
      .select('name')
      .eq('id', id)
      .single();
    if (se) throw se;
    const shiftName = s?.name || '';
    if (shiftName) {
      await supabase.from('people').update({ shift: '' }).eq('shift', shiftName);
    }
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Excel rows
  async saveExcelData(data) {
    const rows = (data || []).map(r => ({
      w_datetime: normalizeIso(r.date),
      site: r.site || r.siteName || null,
      user_full_name: r.person || null,
      person_name: r.person || null,
      amount_due: r.amountDue ?? null,
      gvm_fine: r.gvmFine ?? null,
      d1_fine: r.d1Fine ?? null,
      d2_fine: r.d2Fine ?? null,
      d3_fine: r.d3Fine ?? null,
      d4_fine: r.d4Fine ?? null,
      awkward_load_fine: r.awkwardLoadFine ?? null,
      amount_due_driver: r.amountDueDriver ?? null,
      total_revenue: r.totalRevenue ?? null,
    }));
    if (!rows.length) return true;
    const { error } = await supabase.from('weighbridge_records').insert(rows);
    if (error) throw error;
    return true;
  }

  async getLatestExcelData() {
    const { data, error } = await supabase
      .from('weighbridge_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;
    return data || [];
  }

  async clearAllData() {
    await supabase.from('weighbridge_records').delete().neq('id', 0);
    await supabase.from('people').delete().neq('id', 0);
    await supabase.from('groups').delete().neq('id', 0);
    await supabase.from('shifts').delete().neq('id', 0);
    return true;
  }

  async exportAllData() {
    const [people, groups, shifts] = await Promise.all([
      this.getAllPeople(), this.getAllGroups(), this.getAllShifts()
    ]);
    const { data: totalsData, error } = await supabase
      .from('weighbridge_records')
      .select('total_revenue');
    if (error) throw error;
    const totalRevenue = (totalsData || []).reduce((a, r) => a + (Number(r.total_revenue) || 0), 0);
    const { count } = await supabase
      .from('weighbridge_records')
      .select('*', { count: 'exact', head: true });
    const overview = {
      totalRecords: count ?? 0,
      totalRevenue,
      generatedAt: new Date().toISOString(),
    };
    return {
      metadata: { exportedAt: new Date().toISOString(), version: '1.0', database: 'Supabase' },
      people, groups, shifts, excelData: { summary: overview }
    };
  }
}

const db = new SupabaseWeighbridgeDB();
export default db;
