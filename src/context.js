import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import db from './database';

const AppContext = createContext(null);

const STORAGE_KEY = 'weighbridge_session_v1';

export function AppProvider({ children }) {
  const [rows, setRows] = useState([]); // parsed rows from Excel
  const [peopleToGroup, setPeopleToGroup] = useState({}); // { person: groupName }
  const [peopleToShift, setPeopleToShift] = useState({}); // { person: shiftName }
  const [dbInitialized, setDbInitialized] = useState(false);

  // Initialize database
  useEffect(() => {
    async function initDatabase() {
      try {
        await db.init();
        setDbInitialized(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    }
    initDatabase();
  }, []);

  // Load session data from localStorage (fallback) and database
  useEffect(() => {
    if (!dbInitialized) return;
    
    async function loadData() {
      try {
        // Try to load from database first
        const people = await db.getAllPeople();
        if (people.length > 0) {
          // Build assignments from database
          const groupAssignments = {};
          const shiftAssignments = {};
          
          people.forEach(person => {
            if (person.group) {
              groupAssignments[person.name] = person.group;
            }
            if (person.shift) {
              shiftAssignments[person.name] = person.shift;
            }
          });
          
          setPeopleToGroup(groupAssignments);
          setPeopleToShift(shiftAssignments);
          console.log('Loaded assignments from database');
        } else {
          // Fallback to localStorage
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
      } catch (error) {
        console.error('Failed to load data from database:', error);
        // Fallback to localStorage
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
    }
    
    loadData();
  }, [dbInitialized]);

  // Save session data to localStorage (fallback)
  useEffect(() => {
    if (!dbInitialized) return;
    
    const payload = { rows, peopleToGroup, peopleToShift };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save session data:', e);
    }
  }, [rows, peopleToGroup, peopleToShift, dbInitialized]);

  // Save Excel data to database when rows change
  useEffect(() => {
    if (!dbInitialized || rows.length === 0) return;
    
    async function saveToDatabase() {
      try {
        await db.saveExcelData(rows);
        console.log('Excel data saved to database');
      } catch (error) {
        console.error('Failed to save Excel data to database:', error);
      }
    }
    saveToDatabase();
  }, [rows, dbInitialized]);

  // Sync group assignments with database
  const syncGroupAssignments = async (assignments) => {
    if (!dbInitialized) return;
    
    try {
      for (const [person, group] of Object.entries(assignments)) {
        if (group) {
          // Find the person in database and update their group
          const people = await db.getAllPeople();
          const personRecord = people.find(p => p.name === person);
          if (personRecord) {
            await db.updatePerson(personRecord.id, { group });
          } else {
            // Person doesn't exist in database, create them
            await db.addPersonIfNotExists(person, group, '');
          }
        }
      }
      console.log('Group assignments synced with database');
    } catch (error) {
      console.error('Failed to sync group assignments:', error);
    }
  };

  // Sync shift assignments with database
  const syncShiftAssignments = async (assignments) => {
    if (!dbInitialized) return;
    
    try {
      for (const [person, shift] of Object.entries(assignments)) {
        if (shift) {
          // Find the person in database and update their shift
          const people = await db.getAllPeople();
          const personRecord = people.find(p => p.name === person);
          if (personRecord) {
            await db.updatePerson(personRecord.id, { shift });
          } else {
            // Person doesn't exist in database, create them
            await db.addPersonIfNotExists(person, '', shift);
          }
        }
      }
      console.log('Shift assignments synced with database');
    } catch (error) {
      console.error('Failed to sync shift assignments:', error);
    }
  };

  // Wrapper functions for setting assignments that also sync with database
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
    rows.forEach(r => {
      if (r.person) set.add(String(r.person).trim());
    });
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}


