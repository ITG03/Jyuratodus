import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import db from './database';

const AppContext = createContext(null);

const STORAGE_KEY = 'weighbridge_session_v1';

export function AppProvider({ children }) {
  const [rows, setRows] = useState([]); // parsed rows from Excel
  const [peopleToGroup, setPeopleToGroup] = useState({}); // { person: groupName }
  const [peopleToShift, setPeopleToShift] = useState({}); // { person: shiftName }
  const [dbInitialized, setDbInitialized] = useState(false);

  // Global filters for analytics pages
  const [filters, setFilters] = useState({
    start: '', // ISO date (YYYY-MM-DD)
    end: '',   // ISO date (YYYY-MM-DD)
    site: '',
    group: '',
    shift: '',
    person: ''
  });

  // Initialize backend API
  useEffect(() => {
    async function initDatabase() {
      try {
        await db.init();
        setDbInitialized(true);
        console.log('API ready');
      } catch (error) {
        console.error('Failed to connect to API:', error);
      }
    }
    initDatabase();
  }, []);

  // Load assignments from backend or localStorage fallback
  useEffect(() => {
    if (!dbInitialized) return;
    (async () => {
      try {
        const people = await db.getAllPeople();
        const groupAssignments = {};
        const shiftAssignments = {};
        people.forEach(person => {
          if (person.group) groupAssignments[person.name] = person.group;
          if (person.shift) shiftAssignments[person.name] = person.shift;
        });
        setPeopleToGroup(groupAssignments);
        setPeopleToShift(shiftAssignments);
      } catch (error) {
        console.error('Failed to load people from API:', error);
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            setRows(saved.rows || []);
            setPeopleToGroup(saved.peopleToGroup || {});
            setPeopleToShift(saved.peopleToShift || {});
          }
        } catch (e) {
          console.warn('Failed to load session data from localStorage:', e);
        }
      }
    })();
  }, [dbInitialized]);

  // Save session data to localStorage (fallback only)
  useEffect(() => {
    const payload = { rows, peopleToGroup, peopleToShift };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
  }, [rows, peopleToGroup, peopleToShift]);

  // Sync group assignments with backend
  const syncGroupAssignments = async (assignments) => {
    if (!dbInitialized) return;
    try {
      const people = await db.getAllPeople();
      for (const [person, group] of Object.entries(assignments)) {
        if (!person) continue;
        const personRecord = people.find(p => p.name === person);
        if (personRecord) {
          await db.updatePerson(personRecord.id, { group: group || '' });
        } else if (group) {
          await db.addPersonIfNotExists(person, group, '');
        }
      }
    } catch (error) {
      console.error('Failed to sync group assignments:', error);
    }
  };

  // Sync shift assignments with backend
  const syncShiftAssignments = async (assignments) => {
    if (!dbInitialized) return;
    try {
      const people = await db.getAllPeople();
      for (const [person, shift] of Object.entries(assignments)) {
        if (!person) continue;
        const personRecord = people.find(p => p.name === person);
        if (personRecord) {
          await db.updatePerson(personRecord.id, { shift: shift || '' });
        } else if (shift) {
          await db.addPersonIfNotExists(person, '', shift);
        }
      }
    } catch (error) {
      console.error('Failed to sync shift assignments:', error);
    }
  };

  // Wrapper setters + sync
  const setPeopleToGroupWithSync = async (assignments) => {
    setPeopleToGroup(assignments);
    await syncGroupAssignments(assignments);
  };
  const setPeopleToShiftWithSync = async (assignments) => {
    setPeopleToShift(assignments);
    await syncShiftAssignments(assignments);
  };

  const distinctPeople = useMemo(() => {
    const set = new Set();
    rows.forEach(r => { if (r.person) set.add(String(r.person).trim()); });
    return Array.from(set).sort();
  }, [rows]);

  const value = {
    rows,
    setRows,
    peopleToGroup,
    setPeopleToGroup: setPeopleToGroupWithSync,
    peopleToShift,
    setPeopleToShift: setPeopleToShiftWithSync,
    distinctPeople,
    db,
    dbInitialized,
    syncGroupAssignments,
    syncShiftAssignments,
    filters,
    setFilters,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}


