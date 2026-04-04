# Standard Fee Calculator & Case Management App

## Overview
A mobile-first application for anaesthesiologists to manage surgical cases, calculate standard professional fees based on ISA-RVG guidelines, track payment status, and generate bill receipts.

## Core Features

### 1. Case Management
- **Add Case**: Form with Patient Name, Age, Gender, Surgery Name, Surgeon Name, Hospital, Date, Anaesthesia Type, Anaesthesia Fees, Notes
- **Save as Paid/Pending**: Dual save buttons to mark payment status at case creation
- **Cases List**: FlatList with pull-to-refresh, stats (Cases, Received, Pending)
- **Case Detail**: Full case info with payment status toggle
- **Delete Case**: Remove cases with confirmation

### 2. Payment Status Tracking
- Cases can be marked as "Paid" or "Pending"
- Toggle payment status from case detail page
- Stats show total received vs pending amounts
- Visual badges (green = paid, orange = pending)

### 3. Today's Roster
- Horizontal scrollable cards on home page
- Shows today's cases: Hospital, Patient, Surgeon, Time
- Quick access to case detail

### 4. Standard Fee Calculator (ISA-RVG based)
- **City Tier**: Tier 1 (₹1,000/unit), Tier 2 (₹700/unit), Tier 3 (₹400/unit, default)
- **Surgical Complexity**: Minor (4), Intermediate (7), Major (12), Supra-Major (20 units)
- **Duration**: Time units = Max(0, ceil((mins-60)/15))
- **ASA III/IV**: Adds 2 units
- **Emergency**: +30% surcharge
- **Case Cancelled**: Fee remains 100%
- **Auto-fill**: "Use This Amount" fills the fees input

### 5. Analytics Dashboard
- Monthly/Yearly toggle view
- Total Cases, Total Fees, Received, Pending
- Collection rate progress bar
- Monthly breakdown with individual progress bars

### 6. CSV Export
- Download all cases as CSV for tax/accounting

### 7. PDF Bill Receipt
- Professional "RECEIPT FOR PROFESSIONAL SERVICES" format
- Doctor details: Name, Degree, Designation | City, Reg No
- Auto-generated Receipt Number (REC-DDMM-NNN)
- Case details, fee statement, mode of payment
- Signature line at bottom right

### 8. Doctor Profile (One-time Setup)
- Name, Degree, Registration Number, Designation, City
- Live receipt preview on profile screen
- Accessible via person icon in home header
- Used to populate bill receipts

## API Endpoints
- `POST /api/cases` - Create case (with payment_status, mode_of_payment, auto receipt_no)
- `GET /api/cases` - List all cases
- `GET /api/cases/export/csv` - Export CSV (includes receipt_no, payment_status, mode_of_payment)
- `GET /api/cases/{id}` - Get case detail
- `DELETE /api/cases/{id}` - Delete case
- `PATCH /api/cases/{id}/payment-status` - Toggle paid/pending
- `GET /api/analytics` - Monthly/yearly analytics
- `GET /api/doctor-profile` - Get doctor profile
- `PUT /api/doctor-profile` - Save/update doctor profile

## Tech Stack
- **Frontend**: React Native (Expo SDK 54), expo-router
- **Backend**: FastAPI, Motor (MongoDB async)
- **Database**: MongoDB
- **PDF**: expo-print + expo-sharing

## Authentication
- None (single user app)
