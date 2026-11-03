-- Terranexus Properties seed data for Hostinger / cPanel MySQL
USE `terranexusproperties`;

-- Admin: admin@terranexusproperties.com / Admin@12345  (bcrypt via npm run seed)
INSERT INTO `admin_users` (`uuid`,`name`,`email`,`phone`,`password_hash`,`role`,`is_active`)
VALUES (
  UUID(),
  'Site Administrator',
  'admin@terranexusproperties.com',
  '7350196969',
  '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQRmZHqFqJ5qJ5qJ5qJ5qJ5qJ5qJ5qu',
  'super_admin',
  1
);

-- NOTE: password hash above is placeholder — runtime seed script generates real bcrypt.
-- Use: npm run seed after deploy.

INSERT INTO `site_settings` (`setting_group`,`setting_key`,`setting_value`,`value_type`,`is_public`) VALUES
('brand','site_name','Terranexus Properties', 'string', 1),
('brand','site_tagline','Buy · Sell · Rent across India', 'string', 1),
('brand','logo_url','/assets/logo.svg', 'string', 1),
('brand','favicon_url','/assets/favicon.ico', 'string', 1),
('theme','primary_color','#1B64F2', 'color', 1),
('theme','secondary_color','#0F172A', 'color', 1),
('theme','accent_color','#F5B942', 'color', 1),
('theme','surface_color','#F4F7FC', 'color', 1),
('theme','hero_overlay','rgba(10,37,64,0.55)', 'string', 1),
('theme','font_display','"Fraunces", Georgia, serif', 'string', 1),
('theme','font_body','"Manrope", system-ui, sans-serif', 'string', 1),
('theme','border_radius','16', 'number', 1),
('theme','enable_3d','true', 'boolean', 1),
('contact','phone','+91 73501 96969', 'string', 1),
('contact','whatsapp','917350196969', 'string', 1),
('contact','email','terranexusproperties@gmail.com', 'string', 1),
('contact','address','India', 'string', 1),
('contact','office_hours','Mon–Sat 10:00 AM – 7:00 PM', 'string', 1),
('social','facebook','', 'string', 1),
('social','instagram','', 'string', 1),
('social','youtube','', 'string', 1),
('seo','default_title','Terranexus Properties | Find Your Dream Home', 'string', 1),
('seo','default_description','Browse sale & rent properties across India with Terranexus Properties — verified listings and expert guidance.', 'string', 1),
('seo','site_url','https://terranexusproperties.com', 'string', 1),
('seo','default_keywords','property for sale, property for rent, real estate India, Terranexus Properties, buy home, rent home', 'string', 1),
('seo','og_image','', 'string', 1),
('maps','google_maps_embed_key','', 'string', 0),
('features','show_whatsapp_float','true', 'boolean', 1),
('features','show_call_float','true', 'boolean', 1),
('features','currency_symbol','₹', 'string', 1),
('features','price_format','indian', 'string', 1);

INSERT INTO `property_categories` (`name`,`slug`,`icon`,`sort_order`) VALUES
('Residential','residential','home',1),
('Commercial','commercial','building',2),
('Industrial','industrial','factory',3),
('Land / Plot','land-plot','map',4);

INSERT INTO `property_types` (`category_id`,`name`,`slug`,`sort_order`) VALUES
(1,'Apartment','apartment',1),
(1,'Flat','flat',2),
(1,'Villa','villa',3),
(1,'Bungalow','bungalow',4),
(1,'Row House','row-house',5),
(1,'Penthouse','penthouse',6),
(1,'Studio','studio',7),
(1,'Plot','residential-plot-type',8),
(2,'Office','office',1),
(2,'Shop','shop',2),
(2,'Showroom','showroom',3),
(2,'Warehouse','warehouse',4),
(2,'Commercial Building','commercial-building',5),
(2,'Commercial Plot','commercial-plot-type',6),
(3,'Industrial Shed','industrial-shed',1),
(3,'Industrial Land','industrial-land',2),
(4,'Residential Plot','residential-plot',1),
(4,'Commercial Plot','commercial-plot',2),
(4,'Agricultural Land','agricultural-land',3);

INSERT INTO `locations` (`name`,`slug`,`city`,`state`,`is_popular`,`sort_order`,`latitude`,`longitude`) VALUES
('Kharghar','kharghar','Navi Mumbai','Maharashtra',1,1,19.0440000,73.0610000),
('Panvel','panvel','Navi Mumbai','Maharashtra',1,2,18.9894000,73.1175000),
('Kamothe','kamothe','Navi Mumbai','Maharashtra',1,3,19.0167000,73.0967000),
('Kalamboli','kalamboli','Navi Mumbai','Maharashtra',1,4,19.0333000,73.1000000),
('Taloja','taloja','Navi Mumbai','Maharashtra',1,5,19.0756000,73.1200000),
('Belapur','belapur','Navi Mumbai','Maharashtra',1,6,19.0237000,73.0392000),
('Ulwe','ulwe','Navi Mumbai','Maharashtra',0,7,18.9780000,73.0300000),
('Nerul','nerul','Navi Mumbai','Maharashtra',0,8,19.0330000,73.0197000);

INSERT INTO `amenities` (`name`,`slug`,`icon`,`amenity_group`,`sort_order`) VALUES
('Lift','lift','elevator','building',1),
('Parking','parking','car','building',2),
('Security','security','shield','safety',3),
('CCTV','cctv','camera','safety',4),
('Gym','gym','dumbbell','lifestyle',5),
('Swimming Pool','swimming-pool','pool','lifestyle',6),
('Garden','garden','tree','lifestyle',7),
('Club House','club-house','users','lifestyle',8),
('Children Play Area','children-play-area','smile','lifestyle',9),
('Power Backup','power-backup','zap','utilities',10),
('Water Supply','water-supply','droplet','utilities',11),
('Fire Safety','fire-safety','flame','safety',12),
('Intercom','intercom','phone','building',13),
('Visitor Parking','visitor-parking','parking-circle','building',14),
('Balcony','balcony','layout','unit',15);

INSERT INTO `content_blocks` (`block_key`,`title`,`subtitle`,`body`,`cta_label`,`cta_url`,`sort_order`) VALUES
('hero','Find Your Dream Home','Sale & Rent across India','Premium apartments, villas, shops and plots — curated by Terranexus Properties.','Browse Properties','/properties',1),
('about','Your Trusted Property Partner','Pan-India specialists','We help buyers and renters discover the right home with transparent pricing, verified listings, and on-ground support.','About Us','/about',2),
('why_us','Why Choose Terranexus Properties',NULL,'[{"title":"Local Expertise","text":"Deep knowledge of Indian micro-markets."},{"title":"Verified Listings","text":"Every property is reviewed before going live."},{"title":"Fast Response","text":"Same-day callbacks on WhatsApp & phone."}]','Contact Us','/contact',3),
('cta','Ready to find your next property?','Talk to our consultant today','Call or WhatsApp for site visits, pricing guidance, and shortlisted matches.','Enquire Now','/contact',4);

INSERT INTO `testimonials` (`name`,`role`,`rating`,`message`,`sort_order`) VALUES
('Rahul Sharma','Home Buyer, Kharghar',5,'Found a perfect 2 BHK within a week. Transparent process and great follow-up.',1),
('Priya Nair','Tenant, Kamothe',5,'Smooth rentals experience. The team arranged visits quickly on WhatsApp.',2),
('Amit Patil','Investor, Panvel',5,'Clear documentation support and honest market advice for plot investment.',3);
