const authService = require('../services/authService');
const propertyService = require('../services/propertyService');
const enquiryService = require('../services/enquiryService');
const masterService = require('../services/masterService');
const settingsService = require('../services/settingsService');
const dashboardService = require('../services/dashboardService');
const mailService = require('../services/mailService');
const { ok, asyncHandler } = require('../utils/response');
const {
  loginSchema,
  enquirySchema,
  adminEnquirySchema,
  followUpSchema,
  propertySchema,
  parse,
} = require('../validators');
const config = require('../config');

const auth = {
  login: asyncHandler(async (req, res) => {
    const body = parse(loginSchema, req.body);
    const data = await authService.login(body.email, body.password);
    ok(res, data);
  }),
  me: asyncHandler(async (req, res) => {
    ok(res, await authService.getProfile(req.admin.id));
  }),
  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.admin.id, req.body.currentPassword, req.body.newPassword);
    ok(res, { message: 'Password updated' });
  }),
};

const publicApi = {
  home: asyncHandler(async (_req, res) => {
    const [settings, blocks, testimonials, featured, latest, categories, types, locations] =
      await Promise.all([
        settingsService.getPublicSettings(),
        settingsService.getContentBlocks(),
        settingsService.getTestimonials(),
        propertyService.getFeatured(6),
        propertyService.getLatest(8),
        masterService.listCategories(true),
        masterService.listTypes(null, true),
        masterService.listLocations({ popularOnly: true }),
      ]);
    ok(res, { settings, blocks, testimonials, featured, latest, categories, types, locations });
  }),
  settings: asyncHandler(async (_req, res) => {
    ok(res, await settingsService.getPublicSettings());
  }),
  properties: asyncHandler(async (req, res) => {
    const result = await propertyService.searchProperties(req.query);
    ok(res, result.items, result.meta);
  }),
  property: asyncHandler(async (req, res) => {
    ok(res, await propertyService.getPropertyBySlugOrId(req.params.slug, { bumpViews: true }));
  }),
  categories: asyncHandler(async (_req, res) => ok(res, await masterService.listCategories())),
  types: asyncHandler(async (req, res) =>
    ok(res, await masterService.listTypes(req.query.category_id || null))
  ),
  locations: asyncHandler(async (req, res) =>
    ok(res, await masterService.listLocations({ popularOnly: req.query.popular === '1' }))
  ),
  amenities: asyncHandler(async (req, res) =>
    ok(res, await masterService.listAmenities(true, req.query.type_id || null))
  ),
  options: asyncHandler(async (req, res) =>
    ok(res, await masterService.listOptions(req.query.type || null, true))
  ),
  fieldDefinitions: asyncHandler(async (req, res) =>
    ok(res, await masterService.listFieldDefinitions(req.query.type || req.query.sub_category || null))
  ),
  enquiry: asyncHandler(async (req, res) => {
    const body = parse(enquirySchema, req.body);
    const data = await enquiryService.createEnquiry(body, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      sourcePage: req.get('referer'),
    });
    ok(res, data, null, 201);
  }),
  content: asyncHandler(async (req, res) => {
    const allowed = ['about_page', 'services_page', 'team_page', 'blog_posts', 'privacy_policy', 'terms_page'];
    if (!allowed.includes(req.params.key)) {
      const { AppError } = require('../utils/response');
      throw new AppError('Not found', 404);
    }
    const { query } = require('../db/pool');
    const rows = await query('SELECT setting_value FROM site_settings WHERE setting_key = :key LIMIT 1', { key: req.params.key });
    const raw = rows[0]?.setting_value;
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = raw; }
    }
    ok(res, data);
  }),
  propertyVideos: asyncHandler(async (_req, res) => {
    const { query } = require('../db/pool');
    ok(res, await query(
      `SELECT p.id, p.title, p.slug, p.purpose, p.price, p.price_display, p.monthly_rent, p.main_image,
              p.video_url, p.youtube_url, p.locality, p.city, t.name AS type_name, l.name AS location_name
       FROM properties p
       LEFT JOIN property_types t ON t.id = p.type_id
       LEFT JOIN locations l ON l.id = p.location_id
       WHERE p.deleted_at IS NULL AND p.status = 'published'
         AND ((p.youtube_url IS NOT NULL AND p.youtube_url != '') OR (p.video_url IS NOT NULL AND p.video_url != ''))
       ORDER BY p.is_featured DESC, p.published_at DESC LIMIT 8`
    ));
  }),
  sitemap: asyncHandler(async (_req, res) => {
    const settings = await settingsService.getPublicSettings();
    const siteUrl = String(settings.seo?.site_url || config.frontendUrl || '')
      .trim()
      .replace(/\/$/, '');
    if (!siteUrl) {
      res.status(500).type('text/plain').send('seo.site_url is not configured');
      return;
    }

    const properties = await propertyService.listPublishedForSitemap();
    const staticPaths = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/properties', changefreq: 'daily', priority: '0.9' },
      { loc: '/about', changefreq: 'monthly', priority: '0.6' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.6' },
    ];

    const escapeXml = (s) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const toDate = (d) => {
      if (!d) return new Date().toISOString().slice(0, 10);
      const dt = new Date(d);
      return Number.isNaN(dt.getTime()) ? new Date().toISOString().slice(0, 10) : dt.toISOString().slice(0, 10);
    };

    const urls = [
      ...staticPaths.map(
        (p) => `  <url>
    <loc>${escapeXml(siteUrl + p.loc)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
      ),
      ...properties.map(
        (p) => `  <url>
    <loc>${escapeXml(`${siteUrl}/property/${p.slug}`)}</loc>
    <lastmod>${toDate(p.updated_at || p.published_at)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
    res.status(200).type('application/xml').send(xml);
  }),
};

const admin = {
  dashboard: asyncHandler(async (_req, res) => ok(res, await dashboardService.getDashboardStats())),
  properties: asyncHandler(async (req, res) => {
    const result = await propertyService.searchProperties(req.query, { includeDrafts: true });
    ok(res, result.items, result.meta);
  }),
  property: asyncHandler(async (req, res) => {
    ok(res, await propertyService.getPropertyBySlugOrId(req.params.id, { admin: true }));
  }),
  createProperty: asyncHandler(async (req, res) => {
    const body = parse(propertySchema, req.body);
    ok(res, await propertyService.createProperty(body, req.admin.id), null, 201);
  }),
  updateProperty: asyncHandler(async (req, res) => {
    const body = propertySchema.partial().parse(req.body);
    ok(res, await propertyService.updateProperty(req.params.id, body, req.admin.id));
  }),
  deleteProperty: asyncHandler(async (req, res) => {
    await propertyService.softDeleteProperty(req.params.id);
    ok(res, { message: 'Property deleted' });
  }),
  uploadImages: asyncHandler(async (req, res) => {
    const baseUrl = config.appUrl.replace(/\/$/, '');
    const uploaded = await propertyService.addImages(req.params.id, req.files || [], baseUrl);
    const images = await propertyService.listImages(req.params.id);
    ok(res, { uploaded, images }, null, 201);
  }),
  setPrimaryImage: asyncHandler(async (req, res) => {
    ok(res, await propertyService.setPrimaryImage(req.params.id, req.params.imageId));
  }),
  deleteImage: asyncHandler(async (req, res) => {
    ok(res, await propertyService.deleteImage(req.params.id, req.params.imageId));
  }),
  enquiries: asyncHandler(async (req, res) => {
    const result = await enquiryService.listEnquiries(req.query);
    ok(res, result.items, result.meta);
  }),
  enquiry: asyncHandler(async (req, res) => {
    ok(res, await enquiryService.getEnquiry(req.params.id));
  }),
  createEnquiry: asyncHandler(async (req, res) => {
    const body = parse(adminEnquirySchema, req.body);
    const created = await enquiryService.createEnquiry(body, {
      source: 'admin',
      adminId: req.admin.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    ok(res, await enquiryService.getEnquiry(created.id), null, 201);
  }),
  updateEnquiry: asyncHandler(async (req, res) => {
    ok(res, await enquiryService.updateEnquiry(req.params.id, req.body));
  }),
  followUps: asyncHandler(async (req, res) => {
    ok(res, await enquiryService.listFollowUps(req.params.id));
  }),
  addFollowUp: asyncHandler(async (req, res) => {
    const body = parse(followUpSchema, req.body);
    ok(res, await enquiryService.addFollowUp(req.params.id, body, req.admin.id), null, 201);
  }),
  deleteEnquiry: asyncHandler(async (req, res) => {
    await enquiryService.softDeleteEnquiry(req.params.id);
    ok(res, { message: 'Enquiry deleted' });
  }),
  categories: asyncHandler(async (_req, res) =>
    ok(res, await masterService.listCategories(false))
  ),
  types: asyncHandler(async (req, res) =>
    ok(res, await masterService.listTypes(req.query.category_id || null, false))
  ),
  locations: asyncHandler(async (_req, res) =>
    ok(res, await masterService.listLocations({ activeOnly: false }))
  ),
  amenities: asyncHandler(async (req, res) =>
    ok(res, await masterService.listAmenities(false, req.query.type_id || null))
  ),
  options: asyncHandler(async (req, res) =>
    ok(res, await masterService.listOptions(req.query.type || null, false))
  ),
  createOption: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertOption(req.body), null, 201)
  ),
  updateOption: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertOption(req.body, req.params.id))
  ),
  deleteOption: asyncHandler(async (req, res) => {
    await masterService.softDelete('master_options', req.params.id);
    ok(res, { message: 'Deleted' });
  }),
  createCategory: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertCategory(req.body), null, 201)
  ),
  updateCategory: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertCategory(req.body, req.params.id))
  ),
  deleteCategory: asyncHandler(async (req, res) => {
    await masterService.softDelete('property_categories', req.params.id);
    ok(res, { message: 'Deleted' });
  }),
  createType: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertType(req.body), null, 201)
  ),
  updateType: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertType(req.body, req.params.id))
  ),
  deleteType: asyncHandler(async (req, res) => {
    await masterService.softDelete('property_types', req.params.id);
    ok(res, { message: 'Deleted' });
  }),
  createLocation: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertLocation(req.body), null, 201)
  ),
  updateLocation: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertLocation(req.body, req.params.id))
  ),
  deleteLocation: asyncHandler(async (req, res) => {
    await masterService.softDelete('locations', req.params.id);
    ok(res, { message: 'Deleted' });
  }),
  createAmenity: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertAmenity(req.body), null, 201)
  ),
  updateAmenity: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertAmenity(req.body, req.params.id))
  ),
  deleteAmenity: asyncHandler(async (req, res) => {
    await masterService.softDelete('amenities', req.params.id);
    ok(res, { message: 'Deleted' });
  }),
  sellers: asyncHandler(async (_req, res) => ok(res, await masterService.listSellers(false))),
  createSeller: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertSeller(req.body), null, 201)
  ),
  updateSeller: asyncHandler(async (req, res) =>
    ok(res, await masterService.upsertSeller(req.body, req.params.id))
  ),
  deleteSeller: asyncHandler(async (req, res) => {
    await masterService.softDelete('sellers', req.params.id);
    ok(res, { message: 'Deleted' });
  }),
  settings: asyncHandler(async (_req, res) => ok(res, await settingsService.getAllSettings())),
  mailSettings: asyncHandler(async (_req, res) => ok(res, await mailService.getSettings())),
  saveMailSettings: asyncHandler(async (req, res) => ok(res, await mailService.saveSettings(req.body || {}))),
  testMail: asyncHandler(async (req, res) => ok(res, await mailService.sendTest(req.body?.to))),
  emailLogs: asyncHandler(async (req, res) => {
    const result = await mailService.listLogs(req.query);
    ok(res, result.items, result.meta);
  }),
  emailLog: asyncHandler(async (req, res) => ok(res, await mailService.getLog(req.params.id))),
  resendEmail: asyncHandler(async (req, res) => ok(res, await mailService.deliverLog(Number(req.params.id)))),
  updateSettings: asyncHandler(async (req, res) => {
    const entries = Array.isArray(req.body) ? req.body : req.body.settings || [];
    ok(res, await settingsService.upsertSettings(entries));
  }),
  uploadMedia: asyncHandler(async (req, res) => {
    if (!req.file) {
      const { AppError } = require('../utils/response');
      throw new AppError('No file uploaded. Use field name file', 422);
    }
    const baseUrl = config.appUrl.replace(/\/$/, '');
    const url = `${baseUrl}/uploads/site/${req.file.filename}`;
    ok(res, { url, filename: req.file.filename }, null, 201);
  }),
  updateBlock: asyncHandler(async (req, res) => {
    await settingsService.updateContentBlock(req.params.key, req.body);
    ok(res, { message: 'Updated' });
  }),
  testimonials: asyncHandler(async (_req, res) => ok(res, await settingsService.listAllTestimonials())),
  createTestimonial: asyncHandler(async (req, res) =>
    ok(res, await settingsService.createTestimonial(req.body), null, 201)
  ),
  deleteTestimonial: asyncHandler(async (req, res) => {
    await settingsService.deleteTestimonial(req.params.id);
    ok(res, { message: 'Deleted' });
  }),
};

module.exports = { auth, publicApi, admin };
