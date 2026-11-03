const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const enquirySchema = z.object({
  name: z.string().min(2).max(120),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email().optional().or(z.literal('')),
  preferred_contact: z.enum(['call', 'whatsapp', 'email', 'any']).optional(),
  message: z.string().max(2000).optional(),
  enquiry_type: z.enum(['property', 'contact', 'callback']).optional(),
  property_id: z.coerce.number().optional(),
  property_slug: z.string().optional(),
  property_code: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

const optionalText = (max) => z.string().max(max).optional().nullable().or(z.literal(''));

/** Inquiries entered by staff (walk-ins, calls) — looser mobile rule than the public form. */
const adminEnquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  mobile: z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid contact number'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  city: optionalText(100),
  message: optionalText(2000),
  property_id: z.coerce.number().int().positive().optional().nullable(),
  property_type_id: z.coerce.number().int().positive().optional().nullable(),
  property_title: optionalText(255),
  preferred_contact: z.enum(['call', 'whatsapp', 'email', 'any']).optional(),
  enquiry_type: z.enum(['property', 'contact', 'callback']).optional(),
  status: z.string().max(30).optional(),
  lead_type: z.string().max(30).optional(),
  follow_up_date: z.string().optional().nullable(),
});

const followUpSchema = z.object({
  comment: z.string().trim().min(1, 'Comment is required').max(5000),
  client_feedback: optionalText(5000),
  contact_mode: optionalText(30),
  status: z.string().max(30).optional(),
  next_follow_up_date: z.string().optional().nullable(),
});

const propertySchema = z.object({
  title: z.string().min(5).max(255),
  purpose: z.string().min(1).max(40),
  category_id: z.coerce.number().int().positive(),
  type_id: z.coerce.number().int().positive(),
  location_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.string().min(1).max(40).optional(),
  is_featured: z.coerce.boolean().optional(),
  short_description: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  monthly_rent: z.coerce.number().nonnegative().optional().nullable(),
  bedrooms: z.coerce.number().int().optional().nullable(),
  bathrooms: z.coerce.number().int().optional().nullable(),
  carpet_area: z.coerce.number().optional().nullable(),
  builtup_area: z.coerce.number().optional().nullable(),
  plot_area: z.coerce.number().optional().nullable(),
  area_unit: z.string().min(1).max(40).optional(),
  facing: z.string().max(40).optional().nullable(),
  furnishing: z.string().min(1).max(40).optional(),
  possession_status: z.string().min(1).max(40).optional(),
  locality: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  map_url: z.string().max(1000).optional().or(z.literal('')).nullable(),
  show_exact_location: z.coerce.boolean().optional(),
  seller_id: z.coerce.number().int().positive().optional().nullable(),
  landmark: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  plot_area: z.coerce.number().optional().nullable(),
  video_url: z.string().optional().nullable(),
  youtube_url: z.string().optional().nullable(),
  extra_attributes: z.record(z.any()).optional().nullable(),
  amenity_ids: z.array(z.coerce.number()).optional(),
  seo_title: z.string().max(200).optional().nullable(),
  seo_description: z.string().max(320).optional().nullable(),
}).passthrough();

function parse(schema, data) {
  return schema.parse(data);
}

module.exports = {
  loginSchema,
  enquirySchema,
  adminEnquirySchema,
  followUpSchema,
  propertySchema,
  parse,
};
