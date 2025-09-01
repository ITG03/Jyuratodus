# Weighbridge Analytics App

## Project Overview
React-based truck weighbridge analytics application with IndexedDB database integration.

## Tech Stack
- React 19.1.1
- React Bootstrap
- Chart.js & react-chartjs-2 
- IndexedDB for local storage
- Excel parsing with xlsx library

## Test Framework
targetFramework: Jest with React Testing Library

## Key Features
- Excel file upload and parsing
- People/Group/Shift management
- Real-time analytics dashboard
- Data export functionality
- Offline-capable with IndexedDB storage

## Data Model
- Excel rows: { person, group, shift, impounded, date, truckId, _raw }
- People: { id, name, group, shift, createdAt, updatedAt }
- Groups: { id, name, createdAt }
- Shifts: { id, name, createdAt }