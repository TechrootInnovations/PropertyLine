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

INSERT INTO `property_categories` (`name`,`slug`,`icon`,`description`,`sort_order`) VALUES
('Residential','residential','home','Apartments and villas',1),
('Land','land','map','Agriculture land and NA plots',2);

INSERT INTO `property_types` (`category_id`,`name`,`slug`,`sort_order`) VALUES
(1,'Apartment','apartment',1),
(1,'Villa','villa',2),
(2,'Agriculture Land','agriculture-land',1),
(2,'NA Plot','na-plot',2);

INSERT INTO `locations` (`name`,`slug`,`city`,`state`,`is_popular`,`sort_order`,`latitude`,`longitude`) VALUES
('Mumbai','mumbai','Mumbai','Maharashtra',1,1,19.0760900,72.8774260),
('Thane','thane','Thane','Maharashtra',1,2,19.2183300,72.9780900),
('Vashi','vashi','Navi Mumbai','Maharashtra',1,3,19.0770600,72.9989900),
('Panvel','panvel','Navi Mumbai','Maharashtra',1,4,18.9894000,73.1175000),
('Pune','pune','Pune','Maharashtra',1,5,18.5204300,73.8567400),
('Kalyan','kalyan','Kalyan','Maharashtra',1,6,19.2403300,73.1305400),
('Karjat','karjat','Karjat','Maharashtra',1,7,18.9102000,73.3236000),
('Khopoli','khopoli','Khopoli','Maharashtra',1,8,18.7857000,73.3458000);

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

INSERT INTO `master_options` (`master_type`,`name`,`value`,`sort_order`) VALUES
('purpose','Sale','sale',1),
('purpose','Rent','rent',2),
('status','Draft','draft',1),
('status','Published','published',2),
('status','Sold','sold',3),
('status','Rented','rented',4),
('status','Inactive','inactive',5),
('status','Expired','expired',6),
('facing','East','east',1),
('facing','West','west',2),
('facing','North','north',3),
('facing','South','south',4),
('facing','North-East','north-east',5),
('facing','North-West','north-west',6),
('facing','South-East','south-east',7),
('facing','South-West','south-west',8),
('furnishing','N/A','na',1),
('furnishing','Unfurnished','unfurnished',2),
('furnishing','Semi Furnished','semi_furnished',3),
('furnishing','Furnished','furnished',4),
('possession_status','N/A','na',1),
('possession_status','Ready to Move','ready_to_move',2),
('possession_status','Under Construction','under_construction',3),
('area_unit','Sq Ft','sqft',1),
('area_unit','Sq M','sqm',2),
('area_unit','Acre','acre',3),
('area_unit','Guntha','guntha',4);

INSERT INTO `content_blocks` (`block_key`,`title`,`subtitle`,`body`,`cta_label`,`cta_url`,`sort_order`) VALUES
('hero','Find Your Dream Home','Sale & Rent across India','Premium apartments, villas, shops and plots — curated by Terranexus Properties.','Browse Properties','/properties',1),
('about','Your Trusted Property Partner','Pan-India specialists','We help buyers and renters discover the right home with transparent pricing, verified listings, and on-ground support.','About Us','/about',2),
('why_us','Why Choose Terranexus Properties',NULL,'[{"title":"Local Expertise","text":"Deep knowledge of Indian micro-markets."},{"title":"Verified Listings","text":"Every property is reviewed before going live."},{"title":"Fast Response","text":"Same-day callbacks on WhatsApp & phone."}]','Contact Us','/contact',3),
('cta','Ready to find your next property?','Talk to our consultant today','Call or WhatsApp for site visits, pricing guidance, and shortlisted matches.','Enquire Now','/contact',4);

INSERT INTO `testimonials` (`name`,`role`,`rating`,`message`,`sort_order`) VALUES
('Rahul Sharma','Home Buyer, Kharghar',5,'Found a perfect 2 BHK within a week. Transparent process and great follow-up.',1),
('Priya Nair','Tenant, Kamothe',5,'Smooth rentals experience. The team arranged visits quickly on WhatsApp.',2),
('Amit Patil','Investor, Panvel',5,'Clear documentation support and honest market advice for plot investment.',3);
