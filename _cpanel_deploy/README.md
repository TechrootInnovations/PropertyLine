# Hostinger / cPanel deploy — Terranexus Properties

Target domain: `https://terranexusproperties.com`

## Folder layout on Hostinger

```
public_html/
  index.html          ← React build
  assets/             ← Vite assets
  .htaccess           ← SPA rewrite (frontend.htaccess)
  api/
    app.js            ← Passenger entry
    package.json
    .env              ← production secrets (never commit)
    src/
    uploads/
    sql/
```

## One-time Hostinger setup (hPanel)

1. **Domain** — ensure `terranexusproperties.com` points to this hosting.
2. **MySQL**
   - Create database + user
   - Import `property_listing_api/sql/schema_hostinger_import.sql` in phpMyAdmin
   - Also run `property_listing_api/sql/master_options_patch.sql` if schema is older
3. **Node.js**
   - hPanel → **Node.js** → Create application
   - Node version: **18+** (20 recommended)
   - Application root: `domains/terranexusproperties.com/public_html/api`
   - Application URL: `/api`
   - Startup file: `app.js`
4. **Environment** — copy `.env.production.example` → `api/.env` and fill DB + JWT values.
5. In Node app terminal / SSH:
   ```bash
   cd ~/domains/terranexusproperties.com/public_html/api
   npm install --omit=dev
   npm run seed
   ```
6. Restart the Node application in hPanel.

## Deploy with scripts (from your PC)

```powershell
# 1) Build local package into _cpanel_deploy/release/
.\deploy\build-hostinger.ps1

# 2) Upload (set FTP details first — do NOT commit passwords)
$env:FTP_HOST = "ftp.terranexusproperties.com"   # or Hostinger FTP host
$env:FTP_USER = "your_ftp_username"
$env:FTP_PASS = "your_ftp_password"
.\deploy\upload-ftp.ps1
```

After upload: restart Node app in hPanel, then open:

- Site: https://terranexusproperties.com  
- Health: https://terranexusproperties.com/api/health  
- Admin: https://terranexusproperties.com/admin  

Default admin: `admin@terranexusproperties.com` / `Admin@12345` (change after first login).

## Manual File Manager upload

1. Run `.\deploy\build-hostinger.ps1`
2. Upload contents of `_cpanel_deploy/release/frontend/` → `public_html/`
3. Upload contents of `_cpanel_deploy/release/api/` → `public_html/api/`
4. Create/edit `public_html/api/.env` from the example
5. `npm install --omit=dev` + `npm run seed` in the API folder
6. Restart Node.js app

## Security

- Never commit `.env`, Hostinger, or FTP passwords.
- Delete any one-time seed scripts after use.
- Rotate Hostinger password if it was shared in chat/email.
