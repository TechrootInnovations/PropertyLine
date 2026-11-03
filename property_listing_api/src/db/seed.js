const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config');

const sampleProperties = [
  {
    code: 'PROP-1001',
    title: '2 BHK Premium Apartment in Kharghar',
    purpose: 'sale',
    category_id: 1,
    type_id: 1,
    location_id: 1,
    price: 9500000,
    bedrooms: 2,
    bathrooms: 2,
    carpet_area: 1050,
    locality: 'Kharghar',
    city: 'Navi Mumbai',
    furnishing: 'semi_furnished',
    possession_status: 'ready_to_move',
    short_description: 'Spacious 2 BHK with excellent connectivity to schools and metro.',
    description:
      'Premium 2 BHK apartment located in a prime area of Kharghar with excellent connectivity to schools, hospitals, railway station and major commercial areas.',
    amenities: [1, 2, 3, 4, 10, 11],
  },
  {
    code: 'PROP-1002',
    title: '3 BHK Luxury Flat Near Panvel Station',
    purpose: 'sale',
    category_id: 1,
    type_id: 2,
    location_id: 2,
    price: 14500000,
    bedrooms: 3,
    bathrooms: 3,
    carpet_area: 1450,
    locality: 'Panvel',
    city: 'Navi Mumbai',
    furnishing: 'furnished',
    possession_status: 'ready_to_move',
    short_description: 'Vastu-compliant 3 BHK with clubhouse and pool.',
    description: 'Well-planned 3 BHK flat with modular kitchen, covered parking and 24x7 security.',
    amenities: [1, 2, 3, 5, 6, 7, 8],
  },
  {
    code: 'PROP-1003',
    title: '1 BHK for Rent in Kamothe',
    purpose: 'rent',
    category_id: 1,
    type_id: 1,
    location_id: 3,
    price: null,
    monthly_rent: 18000,
    bedrooms: 1,
    bathrooms: 1,
    carpet_area: 580,
    locality: 'Kamothe',
    city: 'Navi Mumbai',
    furnishing: 'semi_furnished',
    possession_status: 'ready_to_move',
    short_description: 'Affordable rental close to highway and markets.',
    description: 'Bright 1 BHK ideal for working professionals. Water supply and lift available.',
    amenities: [1, 2, 3, 11],
  },
  {
    code: 'PROP-1004',
    title: 'Commercial Shop in Kalamboli Market',
    purpose: 'sale',
    category_id: 2,
    type_id: 10,
    location_id: 4,
    price: 6500000,
    bedrooms: null,
    bathrooms: 1,
    carpet_area: 420,
    locality: 'Kalamboli',
    city: 'Navi Mumbai',
    furnishing: 'na',
    possession_status: 'ready_to_move',
    short_description: 'High-footfall retail shop suitable for boutique or clinic.',
    description: 'Ground floor commercial shop with frontage on main market road.',
    amenities: [2, 3, 4, 10],
  },
  {
    code: 'PROP-1005',
    title: 'Residential Plot in Taloja',
    purpose: 'sale',
    category_id: 4,
    type_id: 17,
    location_id: 5,
    price: 3200000,
    bedrooms: null,
    bathrooms: null,
    plot_area: 1200,
    carpet_area: null,
    locality: 'Taloja',
    city: 'Navi Mumbai',
    furnishing: 'na',
    possession_status: 'na',
    short_description: 'Clear-title NA plot in developing locality.',
    description: 'Ideal investment plot with road access and nearby amenities coming up.',
    amenities: [],
  },
  {
    code: 'PROP-1006',
    title: '4 BHK Villa with Garden in Belapur',
    purpose: 'sale',
    category_id: 1,
    type_id: 3,
    location_id: 6,
    price: 28500000,
    bedrooms: 4,
    bathrooms: 4,
    carpet_area: 2800,
    locality: 'Belapur',
    city: 'Navi Mumbai',
    furnishing: 'furnished',
    possession_status: 'ready_to_move',
    short_description: 'Independent villa with private garden and parking for 2 cars.',
    description: 'Premium villa in a quiet Belapur lane — perfect for large families.',
    amenities: [2, 3, 4, 5, 7, 10, 11, 15],
    featured: true,
  },
];

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seed() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });

  try {
    const seedSql = fs.readFileSync(path.join(__dirname, '../../sql/seed.sql'), 'utf8');
    // Skip placeholder admin insert from SQL — we create real bcrypt hash below
    const cleaned = seedSql.replace(
      /INSERT INTO `admin_users`[\s\S]*?;\s*-- NOTE:[\s\S]*?Use: npm run seed after deploy\./m,
      ''
    );
    await connection.query(cleaned);

    const hash = await bcrypt.hash(config.admin.password, 10);
    await connection.execute(
      `INSERT INTO admin_users (uuid, name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, 'super_admin', 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
      [uuidv4(), config.admin.name, config.admin.email, config.admin.phone || '7350196969', hash]
    );

    const [admins] = await connection.execute(
      'SELECT id FROM admin_users WHERE email = ? LIMIT 1',
      [config.admin.email]
    );
    const adminId = admins[0]?.id || null;

    for (const p of sampleProperties) {
      const slug = slugifyTitle(p.title);
      const [result] = await connection.execute(
        `INSERT INTO properties (
          uuid, property_code, title, slug, purpose, category_id, type_id, location_id,
          status, is_featured, short_description, description, price, monthly_rent,
          bedrooms, bathrooms, carpet_area, plot_area, area_unit, locality, city, state,
          furnishing, possession_status, main_image, published_at, created_by
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          'published', ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'sqft', ?, ?, 'Maharashtra',
          ?, ?, ?, NOW(), ?
        )
        ON DUPLICATE KEY UPDATE title = VALUES(title), price = VALUES(price), monthly_rent = VALUES(monthly_rent)`,
        [
          uuidv4(),
          p.code,
          p.title,
          slug,
          p.purpose,
          p.category_id,
          p.type_id,
          p.location_id,
          p.featured ? 1 : 0,
          p.short_description,
          p.description,
          p.price,
          p.monthly_rent || null,
          p.bedrooms,
          p.bathrooms,
          p.carpet_area,
          p.plot_area || null,
          p.locality,
          p.city,
          p.furnishing,
          p.possession_status,
          `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80`,
          adminId,
        ]
      );

      const propertyId = result.insertId;
      if (propertyId && p.amenities?.length) {
        for (const amenityId of p.amenities) {
          await connection.execute(
            'INSERT IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)',
            [propertyId, amenityId]
          );
        }
      }
    }

    console.log('Seed completed.');
    console.log(`Admin login: ${config.admin.email} / ${config.admin.password}`);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}

module.exports = { seed };
