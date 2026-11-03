const express = require('express');
const { auth, publicApi, admin } = require('../controllers');
const { requireAuth } = require('../middleware/auth');
const { uploadPropertyImages, uploadSiteMedia } = require('../middleware/upload');
const { ensureSchema } = require('../db/ensureSchema');

const router = express.Router();

// Apply idempotent schema upgrades once per process before serving requests
router.use((_req, _res, next) => {
  ensureSchema().then(() => next(), () => next());
});

// Public
router.get('/health', (_req, res) => res.json({ ok: true, service: 'terranexusproperties-api' }));
router.get('/home', publicApi.home);
router.get('/settings', publicApi.settings);
router.get('/properties', publicApi.properties);
router.get('/properties/:slug', publicApi.property);
router.get('/categories', publicApi.categories);
router.get('/types', publicApi.types);
router.get('/locations', publicApi.locations);
router.get('/amenities', publicApi.amenities);
router.get('/options', publicApi.options);
router.get('/field-definitions', publicApi.fieldDefinitions);
router.post('/enquiries', publicApi.enquiry);
router.get('/sitemap.xml', publicApi.sitemap);
router.get('/content/:key', publicApi.content);
router.get('/property-videos', publicApi.propertyVideos);

// Auth
router.post('/admin/login', auth.login);
router.get('/admin/me', requireAuth, auth.me);
router.post('/admin/change-password', requireAuth, auth.changePassword);

// Admin
router.get('/admin/dashboard', requireAuth, admin.dashboard);
router.get('/admin/properties', requireAuth, admin.properties);
router.get('/admin/properties/:id', requireAuth, admin.property);
router.post('/admin/properties', requireAuth, admin.createProperty);
router.put('/admin/properties/:id', requireAuth, admin.updateProperty);
router.delete('/admin/properties/:id', requireAuth, admin.deleteProperty);
router.post('/admin/properties/:id/images', requireAuth, uploadPropertyImages, admin.uploadImages);
router.patch('/admin/properties/:id/images/:imageId', requireAuth, admin.setPrimaryImage);
router.delete('/admin/properties/:id/images/:imageId', requireAuth, admin.deleteImage);

router.get('/admin/enquiries', requireAuth, admin.enquiries);
router.post('/admin/enquiries', requireAuth, admin.createEnquiry);
router.get('/admin/enquiries/:id', requireAuth, admin.enquiry);
router.patch('/admin/enquiries/:id', requireAuth, admin.updateEnquiry);
router.put('/admin/enquiries/:id', requireAuth, admin.updateEnquiry);
router.get('/admin/enquiries/:id/followups', requireAuth, admin.followUps);
router.post('/admin/enquiries/:id/followups', requireAuth, admin.addFollowUp);
router.delete('/admin/enquiries/:id', requireAuth, admin.deleteEnquiry);

router.post('/admin/categories', requireAuth, admin.createCategory);
router.put('/admin/categories/:id', requireAuth, admin.updateCategory);
router.delete('/admin/categories/:id', requireAuth, admin.deleteCategory);

router.post('/admin/types', requireAuth, admin.createType);
router.put('/admin/types/:id', requireAuth, admin.updateType);
router.delete('/admin/types/:id', requireAuth, admin.deleteType);

router.post('/admin/locations', requireAuth, admin.createLocation);
router.put('/admin/locations/:id', requireAuth, admin.updateLocation);
router.delete('/admin/locations/:id', requireAuth, admin.deleteLocation);

router.post('/admin/amenities', requireAuth, admin.createAmenity);
router.put('/admin/amenities/:id', requireAuth, admin.updateAmenity);
router.delete('/admin/amenities/:id', requireAuth, admin.deleteAmenity);

router.get('/admin/sellers', requireAuth, admin.sellers);
router.post('/admin/sellers', requireAuth, admin.createSeller);
router.put('/admin/sellers/:id', requireAuth, admin.updateSeller);
router.delete('/admin/sellers/:id', requireAuth, admin.deleteSeller);

router.get('/admin/settings', requireAuth, admin.settings);
router.get('/admin/mail-settings', requireAuth, admin.mailSettings);
router.put('/admin/mail-settings', requireAuth, admin.saveMailSettings);
router.post('/admin/mail-settings/test', requireAuth, admin.testMail);
router.get('/admin/email-logs', requireAuth, admin.emailLogs);
router.get('/admin/email-logs/:id', requireAuth, admin.emailLog);
router.post('/admin/email-logs/:id/resend', requireAuth, admin.resendEmail);
router.put('/admin/settings', requireAuth, admin.updateSettings);
router.post('/admin/media', requireAuth, uploadSiteMedia, admin.uploadMedia);
router.put('/admin/content-blocks/:key', requireAuth, admin.updateBlock);
router.get('/admin/testimonials', requireAuth, admin.testimonials);
router.post('/admin/testimonials', requireAuth, admin.createTestimonial);
router.delete('/admin/testimonials/:id', requireAuth, admin.deleteTestimonial);
router.get('/admin/categories', requireAuth, admin.categories);
router.get('/admin/types', requireAuth, admin.types);
router.get('/admin/locations', requireAuth, admin.locations);
router.get('/admin/amenities', requireAuth, admin.amenities);
router.get('/admin/options', requireAuth, admin.options);
router.post('/admin/options', requireAuth, admin.createOption);
router.put('/admin/options/:id', requireAuth, admin.updateOption);
router.delete('/admin/options/:id', requireAuth, admin.deleteOption);

module.exports = router;
