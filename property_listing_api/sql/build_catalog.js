// Usage: npm i xlsx && node sql/build_catalog.js <workbook.xlsx> sql/property_catalog.json
// Builds sql/property_catalog.json from the client's Excel workbook.
const fs = require('fs');
const X = require('xlsx');

const SRC = process.argv[2];
const OUT = process.argv[3];
const wb = X.readFile(SRC);
const sheet = (n) => X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' }).slice(1);
const slug = (s) => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const CATEGORY_META = {
  Residential: { icon: 'home', description: 'Apartments, villas, houses and residential plots' },
  Commercial: { icon: 'briefcase', description: 'Offices, shops, showrooms and commercial plots' },
  Industrial: { icon: 'factory', description: 'Industrial plots, factories, sheds and warehouses' },
  Land: { icon: 'map', description: 'Agriculture, NA, development and investment land' },
  'Special Properties': { icon: 'star', description: 'Hotels, hostels, buildings and parking spaces' },
};

// Suggested options from the workbook + sensible defaults for common dropdowns
const suggested = {};
sheet('Suggested Options').forEach(([field, option]) => {
  if (!field || !option) return;
  (suggested[field] = suggested[field] || []).push(String(option));
});
const DIRECTIONS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];
const SELECTS = {
  'BHK Type': suggested['BHK Type'],
  'Plot Shape': suggested['Plot Shape'],
  'Parking Type': suggested['Parking Type'],
  'Furnishing Status': suggested['Furnishing Status'],
  'Possession Status': ['Ready to Move', 'Under Construction', 'New Launch'],
  'Property Facing': DIRECTIONS,
  'Main Door Facing': DIRECTIONS,
  'Villa Facing': DIRECTIONS,
  'Balcony Facing': DIRECTIONS,
  'Area Unit': ['Sq Ft', 'Sq M', 'Sq Yd', 'Acre', 'Guntha', 'Hectare'],
  'Plot Area Unit': ['Sq Ft', 'Sq M', 'Sq Yd', 'Acre', 'Guntha', 'Hectare'],
  'Covered / Open': ['Covered', 'Open'],
  'Flat / Sloping / Hilly': ['Flat', 'Sloping', 'Hilly'],
  'Male / Female / Co-ed': ['Male', 'Female', 'Co-ed'],
  'Agricultural / NA Status': ['Agricultural', 'NA'],
  'NA Status': ['NA Converted', 'Conversion in Progress', 'Not Converted'],
  'NA Conversion Status': ['Completed', 'In Progress', 'Not Started'],
  'Litigation Status': ['No Litigation', 'Pending', 'Resolved'],
  'Construction Quality': ['Standard', 'Premium', 'Luxury'],
  'Parking Ownership': ['Owned', 'Allotted', 'Rented'],
  'Office Type': ['Bare Shell', 'Warm Shell', 'Fully Furnished'],
  'Water Availability': ['24 x 7', 'Limited Hours', 'Tanker', 'Borewell'],
  'Electricity': ['Available', 'Not Available', 'Nearby'],
  'Road Access': ['Tar Road', 'Concrete Road', 'Kaccha Road', 'No Road'],
};

const UPLOAD = /(Extract|Certificate|Receipt|Sale Deed|Title Report|Property Card|Other Documents|Layout Plan|Sanctioned Plan|Allotment Letter|Fire NOC|Factory License|Hotel License|Food License|PG \/ Hostel License|NA Order$)/i;
const NUMBER = /(^Number of |^No\. of |^\d BHK Units$|Units$|^Total (Floors|Flats|Seats)$|^Available Seats$|^Bedrooms$|^Bathrooms$|^Balconies$|^Cabins$|^Workstations$|^Open Workstations$|^Private Cabins$|Washrooms$|Bathrooms$|^Floor Number$|^Construction Year$|^Building Age$|^Plantation Age$|^Total Seats$|^Occupancy Rate$|^Expected Yield$|^Lock-in Period$|Area$|^Total Land Area$|^Total Plot Area$|^Plot (Length|Width)$|^Road Width$|^Frontage$|^Ceiling Height$|^Clear Height$|^Electricity Load$|^Production Capacity$|^Number of Trees$|Charges$|^Security Deposit$|^Property Tax$|Rate$|^Price per Seat$|^Private Cabin Price$|^Monthly Rent per Bed$|Income$|Revenue$|^Current Market Value$|^FSI$|^FSI \/ FAR$|^Permissible FSI$)/i;
const YESNO_END = /(Available|Approved|Approval|Registered|Applicable|Included|Paid|Touch|Nearby|Clear|Facing|View|Wall|Pond|Shed|Well)$/i;
const FEATURE_SECTIONS = /(Features|Amenities|Outdoor|Interior|Luxury|Facilities|Utilities|Infrastructure|Community|Structures|Building Amenities|Commercial Features|Storage|Water|Legal|Access|Accessibility)/i;
const TEXT_HINT = /(Name|Number$|No\.?$|Type$|Distance$|Nearest|Date|Title$|Dimensions|Zone|Zoning|Usage$|Use$|Crop|Soil|Fertility|Potential|Development|Builder|Project|Society|Tower|Wing|Hissa|Survey|Gat|Mutation Entry|Local Authority|Permitted|Restrictions|Tree Types|Cultivation|Occupancy$|Market|Appreciation|Vehicle Type|Storage Type|Shop Type|Showroom Type|House Type|Land Type|Building Type|Plot Type|Property Type|Villa Type|View$|Level$|Quality)/i;

function inferType(name, section) {
  if (SELECTS[name]) return { type: 'select', options: SELECTS[name] };
  if (/^(Children's Play|Sports|Senior Citizen|Yoga|Barbecue) Area$/i.test(name)) return { type: 'yesno' };
  if (UPLOAD.test(name)) return { type: 'upload' };
  if (NUMBER.test(name)) return { type: 'number' };
  if (/^(View|Distance from Village|Floor \/ Level)$/i.test(name)) return { type: 'text' };
  if (YESNO_END.test(name) && !/(Number|Name)$/i.test(name)) return { type: 'yesno' };
  if (FEATURE_SECTIONS.test(section) && !TEXT_HINT.test(name)) return { type: 'yesno' };
  return { type: 'text' };
}

const cats = [];
const catIndex = {};
sheet('Categories & Subcategories').forEach(([c, sc]) => {
  if (!c || !sc) return;
  if (!catIndex[c]) {
    catIndex[c] = { name: c, slug: slug(c), sort_order: cats.length + 1, ...CATEGORY_META[c], types: [] };
    cats.push(catIndex[c]);
  }
  const cat = catIndex[c];
  cat.types.push({ name: sc, slug: slug(sc), sort_order: cat.types.length + 1 });
});

const fields = [];
const order = {};
const seen = new Set();
const typeCounts = {};
sheet('All Category Fields').forEach(([main, sub, section, name]) => {
  if (!main || !sub || !name) return;
  const key = slug(name);
  const uniq = `${sub}|${key}`;
  if (seen.has(uniq)) return;
  seen.add(uniq);
  order[sub] = (order[sub] || 0) + 1;
  const { type, options } = inferType(String(name).trim(), String(section).trim());
  typeCounts[type] = (typeCounts[type] || 0) + 1;
  fields.push({
    main_category: main,
    sub_category: sub,
    section: section || 'Details',
    field_name: String(name).trim(),
    field_key: key,
    field_type: type,
    options: options || null,
    required: false,
    sort_order: order[sub],
  });
});

// Price Type already exists in masters with its own codes — only purpose/status are merged
const optionMap = { 'Listing Purpose': 'purpose', 'Property Status': 'status' };
const masterOptions = [];
Object.entries(optionMap).forEach(([field, masterType]) => {
  (suggested[field] || []).forEach((name, i) => masterOptions.push({ master_type: masterType, name, value: slug(name).replace(/-/g, '_'), sort_order: i + 1 }));
});

fs.writeFileSync(OUT, JSON.stringify({ generated_from: 'complete_real_estate_property_categories_fields.xlsx', categories: cats, fields, master_options: masterOptions }, null, 1));
console.log('categories', cats.length, 'types', cats.reduce((n, c) => n + c.types.length, 0), 'fields', fields.length, JSON.stringify(typeCounts));
