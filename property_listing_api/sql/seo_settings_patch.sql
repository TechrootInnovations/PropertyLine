-- Patch: add SEO settings for existing Terranexus databases
INSERT INTO `site_settings` (`setting_group`,`setting_key`,`setting_value`,`value_type`,`is_public`) VALUES
('seo','site_url','https://terranexusproperties.com', 'string', 1),
('seo','default_keywords','property for sale, property for rent, real estate India, Terranexus Properties, buy home, rent home', 'string', 1),
('seo','og_image','', 'string', 1)
ON DUPLICATE KEY UPDATE setting_group = VALUES(setting_group);
