# ISA-RVG Fee Calculator & Case Management App

## Overview
A mobile-first application for anaesthesiologists to manage surgical cases, calculate standard professional fees based on ISA (Indian Society of Anaesthesiologists) RVG (Relative Value Guide) standards, and generate bill receipts.

## Core Features

### 1. Case Management
- **Add Case**: Form with Patient Name, Age, Gender, Surgery Name, Surgeon Name, Hospital, Date, Anaesthesia Type, Anaesthesia Fees, Notes
- **Cases List**: FlatList with pull-to-refresh, stats summary (total cases, total earnings)
- **Case Detail**: View all case information with ISA-RVG breakdown
- **Delete Case**: Remove cases with confirmation dialog

### 2. ISA-RVG Fee Calculator
- **City Tier**: Tier 1 (₹1,000/unit), Tier 2 (₹700/unit), Tier 3 (₹400/unit, default)
- **Surgical Complexity**: Minor (4), Intermediate (7), Major (12), Supra-Major (20 units)
- **Duration**: Time units = Max(0, ceil((mins-60)/15))
- **ASA III/IV**: Adds 2 units
- **Emergency**: +30% surcharge
- **Case Cancelled**: Fee remains 100%
- **Auto-fill**: "Use This Amount" fills the fees input

### 3. CSV Export
- Download all cases as CSV for tax/accounting
- Works on web (blob download) and native (expo-sharing)

### 4. PDF Bill Receipt
- Professional receipt with patient, surgery, and fee details
- ISA-RVG breakdown included when available
- Sharing via expo-print + expo-sharing

## Tech Stack
- **Frontend**: React Native (Expo SDK 54), expo-router
- **Backend**: FastAPI, Motor (MongoDB async)
- **Database**: MongoDB
- **PDF**: expo-print
- **Sharing**: expo-sharing

## API Endpoints
- `POST /api/cases` - Create case
- `GET /api/cases` - List all cases
- `GET /api/cases/export/csv` - Export CSV
- `GET /api/cases/{id}` - Get case detail
- `DELETE /api/cases/{id}` - Delete case

## Authentication
- None (single user app)
