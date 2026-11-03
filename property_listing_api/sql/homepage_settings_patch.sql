-- Homepage CMS settings (safe to re-run)
INSERT INTO `site_settings` (`setting_group`,`setting_key`,`setting_value`,`value_type`,`is_public`) VALUES
('homepage','hero_slides','[{"image":"https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2200&q=80","label":"Luxury villas"},{"image":"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2200&q=80","label":"Modern apartments"},{"image":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=80","label":"Premium estates"},{"image":"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=80","label":"City residences"}]','json',1),
('homepage','hero_title','Homes with presence - curated across India.','string',1),
('homepage','hero_subtitle','Private viewings, verified listings, and guidance that feels personal.','string',1),
('homepage','services','[{"title":"Buy a New Home","text":"Explore curated sale listings with expert negotiation and documentation support.","to":"/properties?purpose=sale","image":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80"},{"title":"Sell a Home","text":"Present your property at its best with strategy, photography guidance, and qualified leads.","to":"/contact","image":"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80"},{"title":"Rent a Home","text":"Find the perfect rental faster — furnished, semi-furnished, and family-ready options.","to":"/properties?purpose=rent","image":"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80"}]','json',1),
('homepage','stats','{"homes":150,"cities":28,"response":"24"}','json',1),
('homepage','why_items','[{"title":"Proven Expertise","text":"Seasoned India property specialists guiding every decision with market clarity."},{"title":"Customized Solutions","text":"Shortlists matched to lifestyle, commute, and budget — not generic dumps."},{"title":"Transparent Partnerships","text":"Clear pricing, honest advice, and same-day WhatsApp responses."}]','json',1)
ON DUPLICATE KEY UPDATE
  `setting_group` = VALUES(`setting_group`),
  `setting_value` = VALUES(`setting_value`),
  `value_type` = VALUES(`value_type`),
  `is_public` = VALUES(`is_public`);
