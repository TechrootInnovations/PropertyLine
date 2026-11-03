# Terranexus API — PHP router for Hostinger Premium (no Node / Passenger)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /api/

  # Serve real files (uploads, static) directly
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Route everything else to PHP API
  RewriteRule ^ index.php [L]
</IfModule>

# Deny direct access to env / source dumps
<FilesMatch "^\.env">
  Require all denied
</FilesMatch>
