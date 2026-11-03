# Terranexus Properties — Real Estate Property Listing Platform

Full-stack **React + Node.js + MySQL** property listing & lead-generation system for **Terranexus Properties**, with premium UI/UX, configurable brand/theme, and Hostinger/cPanel-ready deployment.

**Contact:** terranexusproperties@gmail.com · +91 73501 96969

## What's included

| Folder | Purpose |
|--------|---------|
| `property_listing_api/` | Express API, business logic, JWT admin auth, image uploads |
| `property_listing_uiux/` | React (Vite) public site + admin panel |
| `_cpanel_deploy/` | MySQL + Node + React deployment guide for Hostinger/cPanel |

## Local setup

### Prerequisites
- Node.js 18+
- MySQL 8 (or MariaDB 10.4+)

### 1. Database
```bash
cd property_listing_api
cp .env.example .env
# set DB_USER / DB_PASSWORD / DB_NAME=terranexusproperties
npm install
npm run migrate
npm run seed
```

### 2. API
```bash
npm run dev
# http://localhost:5000/api/health
```

### 3. UI
```bash
cd ../property_listing_uiux
cp .env.example .env
npm install
npm run dev
# http://localhost:5173
```

### Default admin
- `admin@terranexusproperties.com` / `Admin@12345`

## Public routes
- `/` Home
- `/properties` Listing + filters
- `/property/:slug` Details + gallery + enquire
- `/about` `/contact`
- `/admin/*` Secure panel

## Admin console
Admin screens live in `property_listing_uiux/src/admin/` — `nav.js` (sidebar menu config), `ui.jsx` (shared UI kit: tables, pagination, modals, search select), `admin.css` (design system) and `pages/`.

**Automatic DB upgrades:** on first request the API runs `src/db/ensureSchema.js`, which idempotently adds the CRM columns/tables (inquiry follow-ups, lead type, follow-up date, amenity ↔ property-type mapping). No manual SQL import is needed; the DB user only needs `ALTER`/`CREATE` rights.

## Hostinger / cPanel production
See [`_cpanel_deploy/README.md`](_cpanel_deploy/README.md).

```powershell
# Build package into _cpanel_deploy/release/
.\deploy\build-hostinger.ps1

# Upload (set FTP env vars — never commit passwords)
$env:FTP_HOST = "ftp.terranexusproperties.com"
$env:FTP_USER = "YOUR_FTP_USER"
$env:FTP_PASS = "YOUR_FTP_PASSWORD"
.\deploy\upload-ftp.ps1
```

For phpMyAdmin import use:
- `property_listing_api/sql/schema_hostinger_import.sql`
- then run `npm run seed` on the server (preferred)
