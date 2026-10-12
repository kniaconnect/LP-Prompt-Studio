/* =====================================================================
   Landing Page Prompt Studio
   Plain JavaScript, no libraries, no build step.

   FILE MAP
   1. Data            – categories, goals, sections, style presets
   2. Helpers         – small utilities
   3. Storage         – LocalStorage load/save (safe against errors)
   4. Recommendation  – transparent rule-based style scoring
   5. Preview         – builds the visual mockup from project data
   6. Prompt          – builds the final prompt text from project data
   7. UI              – views, wizard, forms, dialogs
   8. Init
   ===================================================================== */
(function () {
'use strict';

/* =====================================================================
   1. DATA
   ===================================================================== */

const CATEGORIES = [
  ['digital',   'Digital product (ebook, template, printable)'],
  ['course',    'Online course or membership'],
  ['coaching',  'Coaching or consulting'],
  ['creative',  'Creative or design service'],
  ['fashion',   'Fashion or beauty'],
  ['food',      'Food or beverage'],
  ['wellness',  'Health, wellness or self-care'],
  ['craft',     'Home, craft or handmade goods'],
  ['kids',      'Kids and education'],
  ['tech',      'Technology or software'],
  ['community', 'Events or community'],
  ['personal',  'Personal brand or portfolio'],
  ['other',     'Other']
];

const GOALS = [
  ['digital',  'Sell a digital product'],
  ['service',  'Promote a service'],
  ['leads',    'Collect leads'],
  ['brand',    'Promote a personal brand'],
  ['physical', 'Promote a physical product'],
  ['course',   'Promote a course or membership'],
  ['other',    'Other']
];

const STEPS = ['Brief', 'Design', 'Content', 'Planner', 'Review', 'Prompt'];

/* Landing page sections. "hint" is used inside the generated prompt. */
const SECTION_DEFS = [
  { id: 'hero',     name: 'Hero',              desc: 'First screen: headline, one supporting line, main call to action and a visual.',
    hint: 'A specific headline that says what it is and who it is for, one supporting sentence, the primary CTA and the main visual.' },
  { id: 'problem',  name: 'Problem',           desc: 'Names the situation your audience wants to leave behind.',
    hint: 'Describe the customer problem in the audience\'s own language. No exaggeration, no invented statistics.' },
  { id: 'solution', name: 'Solution',          desc: 'Shows how the product resolves the problem.',
    hint: 'Explain what the product is and how it removes the problem described above.' },
  { id: 'benefits', name: 'Benefits',          desc: 'What the customer gains, written as outcomes.',
    hint: 'Outcome-focused benefits taken only from the brief.' },
  { id: 'features', name: 'Features',          desc: 'What the product contains or does.',
    hint: 'Concrete features or components that are stated in the brief. Do not add features that were not mentioned.' },
  { id: 'how',      name: 'How It Works',      desc: 'A short sequence that makes the next steps feel easy.',
    hint: 'Three to five simple steps from sign-up or purchase to getting the result, only if consistent with the brief.' },
  { id: 'included', name: 'What\'s Included',  desc: 'The exact items the customer receives.',
    hint: 'List what the buyer receives using only items named in the brief or notes. If unknown, keep it general and mark it clearly as [to be confirmed].' },
  { id: 'proof',    name: 'Social Proof',      desc: 'Real testimonials, credentials or other evidence.',
    hint: 'Use only the real proof supplied in this brief. If none is supplied, omit this section or use truthful trust elements such as process, contents or supplied credentials.' },
  { id: 'numbers',  name: 'Numbers',           desc: 'Real figures shown as counters or progress bars.',
    hint: 'Show only the figures listed under "Real numbers" in this brief, exactly as given. If none are listed, omit this section.' },
  { id: 'offer',    name: 'Offer and Pricing', desc: 'Price and what the visitor gets for it.',
    hint: 'Show only the prices supplied. Show a crossed-out price only if a regular price was supplied.' },
  { id: 'bonus',    name: 'Bonus',             desc: 'Extra items that add value to the offer.',
    hint: 'Mention bonuses only if they are listed in the brief or notes. If none are listed, omit this section.' },
  { id: 'faq',      name: 'FAQ',               desc: 'Answers to real buying objections.',
    hint: 'Answer likely objections (who it is for, what is included, how access works, how to pay) using only facts from the brief. Mark unknown facts as [to be confirmed].' },
  { id: 'final',    name: 'Final CTA',         desc: 'A closing call to action.',
    hint: 'A short closing line that restates the main benefit and repeats the primary CTA.' }
];
const SECTION_BY_ID = {};
SECTION_DEFS.forEach(function (s) { SECTION_BY_ID[s.id] = s; });

/* Which sections are switched on by default for each goal.
   The order is always the master order from SECTION_DEFS. */
const GOAL_SECTIONS = {
  digital:  ['hero', 'problem', 'solution', 'benefits', 'included', 'proof', 'offer', 'bonus', 'faq', 'final'],
  service:  ['hero', 'problem', 'solution', 'benefits', 'how', 'proof', 'offer', 'faq', 'final'],
  leads:    ['hero', 'problem', 'benefits', 'how', 'proof', 'faq', 'final'],
  brand:    ['hero', 'solution', 'features', 'proof', 'final'],
  physical: ['hero', 'benefits', 'features', 'proof', 'offer', 'faq', 'final'],
  course:   ['hero', 'problem', 'solution', 'benefits', 'how', 'included', 'proof', 'offer', 'bonus', 'faq', 'final'],
  other:    ['hero', 'problem', 'solution', 'benefits', 'offer', 'faq', 'final']
};

const PERSONALITY = [['calm', 'Calm and gentle'], ['bold', 'Bold and energetic'], ['refined', 'Refined and elegant'], ['warm', 'Warm and friendly'],
  ['natural', 'Natural and earthy'], ['playful', 'Playful and creative'], ['professional', 'Professional and precise'], ['modern', 'Modern and confident']];
const EMOTION = [['trust', 'Trust and credibility'], ['excitement', 'Excitement'], ['calm', 'Calm and relief'], ['delight', 'Delight and fun'],
  ['prestige', 'Prestige and exclusivity'], ['belonging', 'Belonging and warmth']];
const PRICE = [['budget', 'Budget-friendly'], ['mid', 'Mid-range'], ['premium', 'Premium']];
const AUDIENCE = [['genz', 'Young creators and Gen Z'], ['moms', 'Mothers and parents'], ['pros', 'Working professionals'],
  ['beginners', 'Beginners and general public'], ['selfcare', 'Self-care and wellness seekers'], ['shoppers', 'Style-conscious shoppers']];

/* ---------------------------------------------------------------------
   STYLE PRESETS
   To add a new preset: add one object here and add a matching
   ".s-<id>" block in styles.css for its mockup. Nothing else changes.
   --------------------------------------------------------------------- */
const BUILTIN_STYLES = [
  {
    id: 'mono', name: 'Monochrome Editorial',
    description: 'Black and white, oversized serif headlines, ruled columns. Feels like a fashion or architecture magazine.',
    categories: ['creative', 'personal', 'tech', 'fashion', 'coaching', 'course'],
    palette: { bg: '#FFFFFF', surface: '#F1F1EE', ink: '#0B0B0B', muted: '#585858', line: '#0B0B0B', accent: '#0B0B0B', accent2: '#E4E4DF' },
    fonts: { display: 'Georgia, "Times New Roman", serif', body: '"Helvetica Neue", Arial, sans-serif' },
    typography: 'Very large, tightly set serif headlines in a light weight. Small uppercase sans labels with wide letter spacing. Body copy in a neutral sans-serif.',
    layout: 'Strict asymmetric columns separated by full-width rules. Headline dominates the hero, with a tall solid image block beside it. Sections are open, with no containers.',
    components: 'Square corners (0 radius). 1-2px black rules instead of boxes. Numbered rows for lists. No shadows.',
    image: 'Black-and-white or desaturated photography, tall crops, or a solid black block with a large typographic mark when no image exists.',
    cta: 'Solid black rectangle, uppercase small text with wide letter spacing. Secondary action is an underlined text link.',
    avoid: 'Colorful gradients, rounded pills, drop shadows, decorative icons, more than one accent color.',
    fit: { personality: ['professional', 'refined', 'bold'], emotion: ['trust', 'prestige'], price: ['mid', 'premium'], audience: ['pros', 'shoppers'] }
  },
  {
    id: 'luxury', name: 'Luxury',
    description: 'Deep charcoal with muted gold, centered symmetry and generous space. Quiet, expensive and precise.',
    categories: ['fashion', 'coaching', 'personal', 'wellness', 'food'],
    palette: { bg: '#121110', surface: '#1C1A18', ink: '#F2EBDD', muted: '#A39B8B', line: '#4A4231', accent: '#C6A15B', accent2: '#2A261F' },
    fonts: { display: '"Bodoni 72", Didot, "Palatino Linotype", Georgia, serif', body: '"Gill Sans", "Trebuchet MS", sans-serif' },
    typography: 'Elegant high-contrast serif headlines, centered. Small capitals with generous tracking for labels. Light body text on dark.',
    layout: 'Centered, symmetrical compositions with large vertical spacing. Hero image sits in a thin inset frame. Lists run in evenly spaced columns separated by hairlines.',
    components: 'Hairline gold borders, nearly square corners (2px). Inner frames instead of filled boxes. No heavy shadows.',
    image: 'Dark, moody, editorial crops with an inset hairline frame. Warm highlights.',
    cta: 'Outlined gold rectangle with small tracked capitals, fills with gold for the primary action.',
    avoid: 'Bright saturated colors, playful shapes, bold sans headlines, crowded layouts, glow effects.',
    fit: { personality: ['refined'], emotion: ['prestige', 'trust'], price: ['premium'], audience: ['pros', 'shoppers', 'selfcare'] }
  },
  {
    id: 'neo', name: 'Neo-Brutalist',
    description: 'Cream background, thick black outlines, hard offset shadows and sticker-like labels. Loud on purpose.',
    categories: ['creative', 'digital', 'tech', 'community', 'course'],
    palette: { bg: '#FFF3D4', surface: '#FFFFFF', ink: '#111111', muted: '#3A3A3A', line: '#111111', accent: '#FF4B3E', accent2: '#FFD23F' },
    fonts: { display: '"Arial Black", "Helvetica Neue", Impact, sans-serif', body: '"Courier New", Courier, monospace' },
    typography: 'Heavy, tight sans-serif headlines in mixed sizes. Monospace body text. Labels look like stickers.',
    layout: 'Asymmetric blocks that overlap slightly and rotate by a few degrees. Dense but organized. Content sits in outlined boxes on purpose.',
    components: '3px solid black borders, zero-blur offset shadows (6px), small radius or none. Sticker labels rotated about -3 degrees.',
    image: 'Image inside a thick-bordered frame with an offset shadow, sometimes slightly rotated. Flat color blocks behind.',
    cta: 'Yellow block with thick black border and hard shadow that shifts on press. Large uppercase text.',
    avoid: 'Soft shadows, delicate gradients, thin hairlines, glassy effects, muted pastel palettes.',
    fit: { personality: ['bold', 'playful', 'modern'], emotion: ['excitement', 'delight'], price: ['budget', 'mid'], audience: ['genz', 'beginners'] }
  },
  {
    id: 'nature', name: 'Nature-Inspired',
    description: 'Sand, moss and terracotta with organic shapes and warm serif type. Grounded and tactile.',
    categories: ['wellness', 'food', 'craft', 'personal', 'fashion'],
    palette: { bg: '#F2ECE0', surface: '#E6DCC8', ink: '#2D3A28', muted: '#5F6B55', line: '#C9BDA3', accent: '#5A7240', accent2: '#B8643F' },
    fonts: { display: 'Georgia, "Palatino Linotype", serif', body: '"Trebuchet MS", "Segoe UI", sans-serif' },
    typography: 'Warm, slightly soft serif headlines with italic emphasis. Friendly humanist sans body at a comfortable size.',
    layout: 'Flowing sections with irregular rounded shapes. Hero image uses a blob-like organic mask. Two-column lists with leaf-like markers, plenty of breathing room.',
    components: 'Asymmetric large radii on image masks, soft 1px borders in sand tones, very light shadows. Grain-like paper warmth through color, not heavy effects.',
    image: 'Natural light photography with earthy tones, cropped into organic shapes.',
    cta: 'Moss green rounded rectangle with cream text. Secondary action is terracotta underlined text.',
    avoid: 'Neon colors, hard black borders, sharp tech visuals, cold grays, heavy drop shadows.',
    fit: { personality: ['natural', 'warm', 'calm'], emotion: ['calm', 'trust', 'belonging'], price: ['mid', 'premium'], audience: ['selfcare', 'moms', 'shoppers'] }
  },
  {
    id: 'serene', name: 'Serene Minimal',
    description: 'Ultra-quiet layout with wide whitespace, sage tones and thin lines. Built to feel calm.',
    categories: ['wellness', 'coaching', 'personal', 'course', 'digital'],
    palette: { bg: '#F7F5F0', surface: '#EDEEE6', ink: '#38423C', muted: '#6E786F', line: '#D3D8CC', accent: '#7F9680', accent2: '#E2E6DA' },
    fonts: { display: '"Helvetica Neue", "Segoe UI", system-ui, sans-serif', body: '"Helvetica Neue", "Segoe UI", system-ui, sans-serif' },
    typography: 'Light-weight sans-serif headlines with relaxed tracking and moderate size. Short line lengths. Lots of leading.',
    layout: 'Single calm column with very large vertical gaps. Centered hero with plenty of empty space. Lists as spaced, hairline-separated rows.',
    components: '1px sage borders, tiny radius (2px), outlined circles for numbers. No shadows.',
    image: 'Soft, airy photography with low contrast and a lot of margin around it.',
    cta: 'Thin-outlined rectangle with spaced lowercase text; fills softly with sage on emphasis.',
    avoid: 'Heavy black borders, saturated colors, dense grids, loud badges, bold weights.',
    fit: { personality: ['calm', 'refined'], emotion: ['calm', 'trust'], price: ['mid', 'premium'], audience: ['selfcare', 'pros', 'moms'] }
  },
  {
    id: 'playful', name: 'Playful Geometric',
    description: 'Bright flat colors with circles, triangles and squares. Friendly, optimistic and easy to read.',
    categories: ['kids', 'course', 'community', 'digital', 'creative', 'tech'],
    palette: { bg: '#FFFCF3', surface: '#FFFFFF', ink: '#1B1F3B', muted: '#4B5070', line: '#1B1F3B', accent: '#2F5BFF', accent2: '#FFC21A' },
    fonts: { display: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif', body: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif' },
    typography: 'Rounded, bold sans-serif headlines with generous size. Short friendly sentences. Body text stays large and clear.',
    layout: 'Stable grid with playful geometric shapes as visual anchors. Three-up lists with a different shape marking each item. Hero visual built from overlapping shapes.',
    components: 'Medium radius (14px), flat solid fills, no gradients. Circles, triangles and squares as markers. Light outlines only where useful.',
    image: 'Cutout or flat illustration style on a solid color shape. Geometric shapes can frame the image.',
    cta: 'Solid blue button with a yellow offset underlay and bold text.',
    avoid: 'Realistic textures, thin luxurious serifs, muted palettes, too many shapes behind text.',
    fit: { personality: ['playful', 'warm', 'bold'], emotion: ['delight', 'excitement', 'belonging'], price: ['budget', 'mid'], audience: ['genz', 'moms', 'beginners'] }
  },
  {
    id: 'softfem', name: 'Soft Feminine Editorial',
    description: 'Blush, lilac and ivory with italic serif accents, arch-shaped imagery and fine rules. Elegant and gentle.',
    categories: ['fashion', 'wellness', 'coaching', 'personal', 'digital', 'creative'],
    palette: { bg: '#FBF4F1', surface: '#F3E3E4', ink: '#3E2A3F', muted: '#76607A', line: '#DCC6CF', accent: '#6B3F6E', accent2: '#E6D8F0' },
    fonts: { display: 'Georgia, "Times New Roman", serif', body: '"Gill Sans", "Segoe UI", sans-serif' },
    typography: 'High-contrast serif headlines with italic emphasis on key words. Clean sans body text. Small, refined labels.',
    layout: 'Spacious editorial hero with an arch-shaped image beside the text. Alternating image/text bands. Thin rules and small star marks as separators.',
    components: 'Arched image masks, 4px radius on controls, fine 1px plum-tinted rules. Soft color fields rather than boxes.',
    image: 'Portrait or lifestyle photography with soft light, cropped into an arch.',
    cta: 'Plum rectangle with a small radius and cream text; secondary is an outlined version.',
    avoid: 'Overly sugary pink, crowded boxes, thick borders, low-contrast gray text.',
    fit: { personality: ['warm', 'refined', 'calm'], emotion: ['delight', 'belonging', 'calm'], price: ['mid', 'premium'], audience: ['moms', 'selfcare', 'shoppers'] }
  },
  {
    id: 'vibrant', name: 'Modern Vibrant Commerce',
    description: 'Confident color blocks, a strong split hero and clean product-led layouts. Made for shops and offers.',
    categories: ['digital', 'fashion', 'food', 'tech', 'creative', 'course'],
    palette: { bg: '#FFFFFF', surface: '#F4F5FF', ink: '#12123A', muted: '#4A4C75', line: '#D6D8F2', accent: '#2438E8', accent2: '#FFD84A' },
    fonts: { display: '"Helvetica Neue", Arial, sans-serif', body: '"Helvetica Neue", Arial, sans-serif' },
    typography: 'Bold, compact sans-serif headlines in a large size. Clean, readable body text. Prices shown big and clear.',
    layout: 'Split hero: one half a saturated color field, the other the product image. Product-forward sections. Lists as a tidy ruled grid.',
    components: 'Medium-small radius (8px), 1px light borders, color fields instead of shadows. Prices and CTA are the strongest elements.',
    image: 'Clean product shots on a color field with strong crops.',
    cta: 'Cobalt rectangle with white text and an optional yellow accent bar. Large and unmistakable.',
    avoid: 'Rainbow palettes, many decorative shapes, soft pastel washes, heavy shadows.',
    fit: { personality: ['modern', 'bold', 'warm'], emotion: ['excitement', 'trust'], price: ['budget', 'mid'], audience: ['shoppers', 'genz', 'beginners'] }
  }
];
/* ---------------------------------------------------------------------
   FONT STACKS (safe system fonts) and RECIPES
   A "recipe" describes a style's mockup in a few safe choices. Styles
   without their own CSS block (.s-<id>) are drawn from their recipe.
   Custom and imported styles can only pick from these lists, so a
   style file can never inject arbitrary CSS.
   --------------------------------------------------------------------- */
const FONT_STACKS = {
  serif:    'Georgia, "Times New Roman", serif',
  didone:   '"Bodoni 72", Didot, "Palatino Linotype", Georgia, serif',
  sans:     'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  humanist: '"Gill Sans", "Trebuchet MS", "Segoe UI", sans-serif',
  rounded:  '"Trebuchet MS", "Varela Round", "Segoe UI", system-ui, sans-serif',
  heavy:    '"Arial Black", "Helvetica Neue", Impact, sans-serif',
  slab:     'Rockwell, "Courier New", Georgia, serif',
  mono:     'ui-monospace, "Courier New", Courier, monospace',
  hand:     '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'
};
const FONT_LABELS = { serif: 'Classic serif', didone: 'High-contrast serif', sans: 'Clean sans-serif', humanist: 'Humanist sans-serif',
  rounded: 'Rounded sans-serif', heavy: 'Heavy display sans', slab: 'Slab serif', mono: 'Monospace', hand: 'Handwriting' };
function stackOf(v) { return FONT_STACKS[v] || v; }

const RECIPE_OPTS = {
  hero:     [['split', 'Split: text left, image right'], ['splitRev', 'Split: image left, text right'], ['center', 'Centered'], ['colorSplit', 'Color-block split'], ['typeLead', 'Type-led, huge headline']],
  radius:   [['none', 'Square'], ['sm', 'Slightly rounded'], ['md', 'Rounded'], ['lg', 'Very rounded'], ['pill', 'Soft and pill-like']],
  border:   [['none', 'None'], ['thin', 'Thin'], ['medium', 'Medium'], ['thick', 'Thick']],
  shadow:   [['none', 'None'], ['soft', 'Soft'], ['hard', 'Hard offset'], ['dual', 'Soft dual (neumorphic)']],
  weight:   [['light', 'Light'], ['regular', 'Regular'], ['bold', 'Bold'], ['black', 'Extra bold']],
  caps:     [['normal', 'Normal case'], ['upper', 'Uppercase']],
  list:     [['rows', 'Ruled rows'], ['cards', 'Boxes'], ['columns', 'Columns with dividers'], ['open', 'Open, no containers']],
  button:   [['solid', 'Solid'], ['outline', 'Outlined'], ['pill', 'Pill']],
  sections: [['plain', 'Plain'], ['bands', 'Alternating color bands'], ['ruled', 'Ruled with lines']],
  density:  [['tight', 'Tight'], ['normal', 'Normal'], ['airy', 'Airy']]
};
const RECIPE_LABELS = { hero: 'Hero layout', radius: 'Corners', border: 'Borders', shadow: 'Shadows', weight: 'Headline weight', caps: 'Headline case',
  list: 'List layout', button: 'Buttons', sections: 'Section backgrounds', density: 'Spacing' };
const RECIPE_DEFAULT = { hero: 'split', radius: 'md', border: 'thin', shadow: 'none', weight: 'bold', caps: 'normal', list: 'rows', button: 'solid', sections: 'plain', density: 'normal' };

/* Compact builder for the extra presets. */
function mk(id, name, desc, cats, pal, fonts, txt, fit, rec) {
  return {
    id: id, name: name, description: desc, categories: cats,
    palette: { bg: pal[0], surface: pal[1], ink: pal[2], muted: pal[3], line: pal[4], accent: pal[5], accent2: pal[6] },
    fonts: { display: fonts[0], body: fonts[1] },
    typography: txt[0], layout: txt[1], components: txt[2], image: txt[3], cta: txt[4], avoid: txt[5],
    fit: { personality: fit[0], emotion: fit[1], price: fit[2], audience: fit[3] },
    recipe: Object.assign({}, RECIPE_DEFAULT, rec)
  };
}

BUILTIN_STYLES.push(
  mk('depth', 'High-Depth Photography', 'Soft modern look where one large photo carries the hero. Bold headlines, serif accents and diffused shadows.',
    ['fashion', 'food', 'craft', 'creative', 'personal'],
    ['#F5F3EF', '#FFFFFF', '#1D1D1F', '#6B6B70', '#E1DDD5', '#D9622B', '#F1E3D3'], ['sans', 'serif'],
    ['Bold sans-serif headlines with an elegant serif for supporting lines. Generous size and spacing.',
     'Centered hero where the main image is large and the headline sits close to it. Asymmetric sections with plenty of white space.',
     'Large radii only where the composition benefits. Soft diffused shadows. Few borders.',
     'Macro or close-up photography with shallow depth of field. Image is the hero.',
     'Solid warm accent button with a soft shadow.',
     'Hard borders, flat clip-art, crowded grids, harsh shadows.'],
    [['modern', 'refined'], ['delight', 'prestige'], ['mid', 'premium'], ['shoppers', 'selfcare']],
    { hero: 'center', radius: 'lg', border: 'none', shadow: 'soft', weight: 'bold', list: 'cards', sections: 'plain', density: 'airy' }),

  mk('moderndark', 'ModernDark', 'Cinematic dark interface with cool ambient accents and precise spacing. Premium and technical.',
    ['tech', 'course', 'digital', 'community'],
    ['#0B0D12', '#151922', '#EEF1F6', '#98A1B3', '#262D3B', '#7C8CFF', '#1B2236'], ['sans', 'sans'],
    ['Crisp sans-serif, medium to bold headlines, cool light text on dark.',
     'Centered hero with plenty of dark space, thin dividers between sections.',
     'Dark surfaces used deliberately with 1px borders and small radii. Do not turn every element into a glowing card.',
     'Product screenshots or mockups on dark backgrounds.',
     'Solid indigo button, light text.',
     'Neon overload, glow on everything, low-contrast gray text.'],
    [['modern', 'professional'], ['trust', 'excitement'], ['mid', 'premium'], ['pros', 'genz']],
    { hero: 'center', radius: 'md', border: 'thin', shadow: 'none', weight: 'bold', list: 'cards', sections: 'ruled' }),

  mk('editorialgrid', 'Editorial Grid', 'Newspaper-like black and white grid with sharp rules and strong alignment.',
    ['creative', 'personal', 'tech', 'coaching', 'course'],
    ['#FFFFFF', '#F4F4F4', '#111111', '#555555', '#111111', '#111111', '#E8E8E8'], ['serif', 'sans'],
    ['Serif headlines, compact sans body, tight leading. Small caps for labels.',
     'Tight multi-column grid separated by rules. Content is aligned to a visible column structure.',
     'Square corners, 1px black rules, no shadows. Columns instead of boxes.',
     'Black-and-white photography, cropped to the grid.',
     'Solid black rectangle.',
     'Color gradients, rounded shapes, decorative icons.'],
    [['professional', 'bold'], ['trust'], ['mid'], ['pros']],
    { hero: 'split', radius: 'none', border: 'thin', shadow: 'none', weight: 'bold', list: 'columns', sections: 'ruled', density: 'tight' }),

  mk('techstyle', 'TechStyle', 'Confident electric-blue tech look with clear sections and inverted contrast bands.',
    ['tech', 'course', 'digital', 'community'],
    ['#F6F9FF', '#FFFFFF', '#0E1B3D', '#4A5A80', '#D5DEF2', '#2563EB', '#DBE7FF'], ['sans', 'sans'],
    ['Extra-bold sans headlines with a clean sans body. Strong size contrast.',
     'Split hero with a product visual, alternating light bands, clear numbered steps.',
     'Medium radius, soft shadows on a few key elements, color bands for rhythm.',
     'Product or interface screenshots on light blue fields.',
     'Solid electric blue button with soft shadow.',
     'Decorative gradients without purpose, too many glows, stock-photo handshakes.'],
    [['modern', 'professional', 'bold'], ['trust', 'excitement'], ['mid', 'premium'], ['pros', 'beginners']],
    { hero: 'split', radius: 'md', border: 'none', shadow: 'soft', weight: 'black', list: 'cards', sections: 'bands' }),

  mk('swissmin', 'Minimalist', 'International-style minimalism: strict grid, black, white and one red accent.',
    ['creative', 'tech', 'personal', 'coaching', 'digital'],
    ['#FFFFFF', '#F5F5F5', '#111111', '#666666', '#D9D9D9', '#E10600', '#F2F2F2'], ['sans', 'sans'],
    ['One sans-serif family, strong size hierarchy, left-aligned, medium weight.',
     'Mathematical grid, asymmetric balance, generous margins and ruled sections.',
     'Square corners, hairline rules, no shadows. Red used sparingly.',
     'Precise, high-contrast imagery with lots of margin.',
     'Solid red rectangle with white text.',
     'Decoration, gradients, rounded shapes, more than one accent color.'],
    [['professional', 'modern'], ['trust', 'calm'], ['mid', 'premium'], ['pros']],
    { hero: 'split', radius: 'none', border: 'thin', shadow: 'none', weight: 'bold', list: 'rows', sections: 'ruled' }),

  mk('kinetic', 'Kinetic', 'Typography-first, massive uppercase type on a dark field with a single electric accent.',
    ['creative', 'community', 'tech', 'fashion'],
    ['#0A0A0A', '#161616', '#F5F5F5', '#A8A8A8', '#2A2A2A', '#C6FF00', '#1F1F1F'], ['heavy', 'sans'],
    ['Massive uppercase headlines with tight leading. Short supporting copy.',
     'Type-led hero where the headline dominates and the image is secondary. Rhythmic section breaks.',
     'Square, no shadows, open lists with large numbers.',
     'High-contrast, cropped imagery used sparingly.',
     'Neon-lime rectangle with dark text.',
     'Marquee or keyframe animation for Lynk.id, soft pastels, small timid type.'],
    [['bold', 'modern'], ['excitement'], ['budget', 'mid'], ['genz']],
    { hero: 'typeLead', radius: 'none', border: 'none', shadow: 'none', weight: 'black', caps: 'upper', list: 'open', sections: 'ruled', density: 'tight' }),

  mk('flat', 'Flat Design', 'Crisp, solid-color 2D surfaces with simple geometry and no depth effects.',
    ['digital', 'course', 'kids', 'tech', 'community'],
    ['#F4F8FB', '#FFFFFF', '#1F2A44', '#56637E', '#D2DCE8', '#18A999', '#FFC145'], ['rounded', 'sans'],
    ['Friendly bold sans headlines, plain readable body text.',
     'Split hero with a flat illustration or product image, alternating solid color bands.',
     'Solid fills, small radii, no shadows or gradients.',
     'Flat illustrations and simple shapes.',
     'Solid teal button, no shadow.',
     'Shadows, gradients, textures, 3D effects.'],
    [['modern', 'playful', 'warm'], ['delight', 'trust'], ['budget', 'mid'], ['beginners', 'genz', 'moms']],
    { hero: 'split', radius: 'md', border: 'none', shadow: 'none', weight: 'bold', list: 'cards', sections: 'bands' }),

  mk('magazine', 'Premium Magazine', 'Deep charcoal with champagne gold, oversized serif and sharp edges. Fashion-forward.',
    ['fashion', 'personal', 'creative', 'coaching'],
    ['#14110F', '#1E1A17', '#F3ECE0', '#A89F90', '#3B342C', '#D4B26A', '#241F1B'], ['didone', 'sans'],
    ['Oversized high-contrast serif headlines, light weight, with small tracked sans labels.',
     'Asymmetric editorial grid, image left and text right, columns separated by hairlines.',
     'Sharp edges, fine gold rules, outlined buttons.',
     'Fashion-forward editorial photography.',
     'Gold outlined rectangle.',
     'Bright colors, rounded corners, playful shapes.'],
    [['refined', 'bold'], ['prestige'], ['premium'], ['shoppers', 'pros']],
    { hero: 'splitRev', radius: 'none', border: 'thin', shadow: 'none', weight: 'regular', list: 'columns', button: 'outline', sections: 'ruled', density: 'airy' }),

  mk('material', 'Material Design', 'Structured, friendly interface language with clear elevation, tonal color and pill buttons.',
    ['tech', 'digital', 'course', 'community'],
    ['#FEF7FF', '#F3EDF7', '#1D1B20', '#625B71', '#CAC4D0', '#6750A4', '#E8DEF8'], ['sans', 'sans'],
    ['Clean sans-serif, regular-weight headlines, clear hierarchy.',
     'Split hero, tonal surface containers, clear elevation levels.',
     'Large radii, soft elevation shadows, pill buttons.',
     'Product screenshots in rounded frames.',
     'Filled purple pill button.',
     'Copying a stock Material dashboard, harsh borders.'],
    [['modern', 'professional', 'warm'], ['trust', 'delight'], ['budget', 'mid'], ['beginners', 'pros']],
    { hero: 'split', radius: 'lg', border: 'none', shadow: 'soft', weight: 'regular', list: 'cards', button: 'pill' }),

  mk('boldtype', 'Bold Typography', 'Poster-like page where gigantic type is the main visual and everything else stays quiet.',
    ['creative', 'personal', 'community', 'fashion', 'course'],
    ['#F2F0EA', '#FFFFFF', '#0D0D0D', '#4F4F4F', '#0D0D0D', '#FF3B1D', '#E6E2D8'], ['heavy', 'sans'],
    ['Extremely large, uppercase, heavy headlines. Small plain supporting text.',
     'Dramatic negative space, poster-like composition, image secondary to type.',
     'Square, no containers, open lists with big numbers.',
     'Image small or cropped; type does the work.',
     'Solid black-and-red rectangle.',
     'Decoration, small headlines, many competing elements.'],
    [['bold', 'modern'], ['excitement', 'prestige'], ['mid', 'premium'], ['genz', 'shoppers']],
    { hero: 'typeLead', radius: 'none', border: 'none', shadow: 'none', weight: 'black', caps: 'upper', list: 'open', sections: 'plain', density: 'airy' }),

  mk('classic', 'Classic School', 'Warm paper tones, traditional serif and crimson-and-gold accents. Scholarly and trustworthy.',
    ['course', 'coaching', 'kids', 'personal', 'digital'],
    ['#F6EFDF', '#EDE2C8', '#2B2118', '#6E5B45', '#CDBB97', '#8B1E2D', '#B8923A'], ['serif', 'serif'],
    ['Traditional serif for both headings and body. Centered, formal headlines.',
     'Centered hero, ruled sections, a library or university feeling.',
     'Square corners, medium borders in warm brown, no shadows.',
     'Archival or portrait imagery in warm tones.',
     'Crimson rectangle with cream text.',
     'Neon colors, playful shapes, sans-serif headlines.'],
    [['professional', 'refined', 'warm'], ['trust', 'prestige'], ['mid', 'premium'], ['pros', 'moms']],
    { hero: 'center', radius: 'none', border: 'medium', shadow: 'none', weight: 'bold', list: 'rows', sections: 'ruled' }),

  mk('artisan', 'Premium Dynamic Artisan', 'Warm hybrid artisan look: oversized bold type, big rounded shapes and tactile color.',
    ['food', 'craft', 'fashion', 'wellness'],
    ['#FFF6E9', '#F7E3C8', '#3A2418', '#7A5C48', '#E7CDAA', '#C2410C', '#F4B860'], ['heavy', 'sans'],
    ['Oversized bold sans headlines with a warm, friendly tone.',
     'Centered hero with a large product image, alternating colored bands.',
     'Large radii, soft shadows, pill buttons.',
     'Macro product photography with warm light.',
     'Terracotta pill button.',
     'Cold colors, rigid grids, tiny type.'],
    [['warm', 'bold', 'playful'], ['delight', 'belonging'], ['mid', 'premium'], ['shoppers', 'moms']],
    { hero: 'center', radius: 'lg', border: 'none', shadow: 'soft', weight: 'black', list: 'cards', button: 'pill', sections: 'bands' }),

  mk('soft3d', '3D Soft', 'Candy colors and soft, inflated surfaces that feel like a premium digital toy.',
    ['kids', 'digital', 'creative', 'community', 'course'],
    ['#F3EEFF', '#FFFFFF', '#3B2A66', '#7A6AA6', '#E2D8FA', '#FF7AB6', '#B9E6FF'], ['rounded', 'rounded'],
    ['Rounded, extra-bold headlines, friendly and playful.',
     'Centered hero with a soft floating product, generous round shapes.',
     'Very large radii, layered soft shadows, pill buttons.',
     'Soft 3D renders or clay-like illustrations.',
     'Pink pill button with soft shadow.',
     'Sharp corners, flat black outlines, serious corporate tones.'],
    [['playful', 'warm'], ['delight'], ['budget', 'mid'], ['genz', 'moms', 'beginners']],
    { hero: 'center', radius: 'pill', border: 'none', shadow: 'dual', weight: 'black', list: 'cards', button: 'pill' }),

  mk('professional', 'Professional', 'Refined editorial minimalism on warm ivory with rule lines and classical proportions.',
    ['coaching', 'personal', 'course', 'creative'],
    ['#FBF7EE', '#F2EBDA', '#2A2623', '#6B6258', '#D8CFBB', '#7A5A2B', '#E9DFC8'], ['serif', 'serif'],
    ['Elegant serif headlines in regular weight, measured line lengths.',
     'Split hero, ruled sections with classical spacing.',
     'Square corners, thin rules, no shadows.',
     'Portrait or workspace photography with natural light.',
     'Bronze rectangle with ivory text.',
     'Loud colors, heavy shadows, playful decoration.'],
    [['professional', 'refined'], ['trust'], ['mid', 'premium'], ['pros']],
    { hero: 'split', radius: 'none', border: 'thin', shadow: 'none', weight: 'regular', list: 'rows', sections: 'ruled', density: 'airy' }),

  mk('corporate', 'Corporate', 'Friendly modern SaaS look in indigo and violet with soft colored shadows.',
    ['tech', 'course', 'coaching', 'digital'],
    ['#F7F7FF', '#FFFFFF', '#1E1B4B', '#5B5B8F', '#DCDBF5', '#5B4BFF', '#E8E6FF'], ['sans', 'sans'],
    ['Clean geometric sans-serif, bold headlines, comfortable body copy.',
     'Split hero with product visual, color bands, clear sections. Use SaaS patterns selectively.',
     'Rounded corners, soft shadows, light borders.',
     'Product screenshots and simple isometric illustrations.',
     'Solid indigo button.',
     'Dashboard-style boxes everywhere, cold gray palette.'],
    [['professional', 'modern', 'warm'], ['trust'], ['mid', 'premium'], ['pros', 'beginners']],
    { hero: 'split', radius: 'lg', border: 'none', shadow: 'soft', weight: 'bold', list: 'cards', sections: 'bands' }),

  mk('sketch', 'Sketch', 'Hand-drawn, paper-and-marker feeling with playful imperfection.',
    ['kids', 'creative', 'craft', 'course', 'community'],
    ['#FFFDF4', '#FFF7D6', '#2B2B2B', '#5E5E5E', '#2B2B2B', '#E4572E', '#FFE08A'], ['hand', 'hand'],
    ['Handwritten-style headings and body, relaxed and friendly.',
     'Split hero, paper-like background, notes and boxes that look hand drawn.',
     'Marker-like medium borders, slightly rounded corners, no shadows.',
     'Doodles, simple drawings and photos with taped or outlined frames.',
     'Orange marker-style button with a dark outline.',
     'Polished glossy effects, strict grids, thin hairlines.'],
    [['playful', 'warm'], ['delight', 'belonging'], ['budget', 'mid'], ['moms', 'genz', 'beginners']],
    { hero: 'split', radius: 'sm', border: 'medium', shadow: 'none', weight: 'bold', list: 'cards', sections: 'plain' }),

  mk('industrial', 'Industrial', 'Tactile hardware feel in matte neutrals with a safety-orange accent.',
    ['tech', 'craft', 'creative'],
    ['#E9E7E2', '#D9D6CF', '#1C1C1C', '#55524B', '#8E8B84', '#FF5A00', '#2A2A2A'], ['heavy', 'mono'],
    ['Heavy uppercase headlines with monospace body text, like labels on equipment.',
     'Split hero, ruled sections, compact spacing, spec-sheet feeling.',
     'Slightly rounded corners, medium borders, matte surfaces with no gloss.',
     'Product or hardware photography, framed like a spec sheet.',
     'Safety-orange rectangle with dark text.',
     'Glossy gradients, pastel colors, decorative flourishes.'],
    [['professional', 'bold', 'modern'], ['trust', 'excitement'], ['mid', 'premium'], ['pros']],
    { hero: 'split', radius: 'sm', border: 'medium', shadow: 'none', weight: 'bold', caps: 'upper', list: 'cards', sections: 'ruled', density: 'tight' }),

  mk('neumorph', 'Neumorphism', 'Monochrome surfaces that look softly extruded or pressed with dual shadows.',
    ['tech', 'wellness', 'digital'],
    ['#E6EAF0', '#E6EAF0', '#2F3B52', '#5B6880', '#D0D6E0', '#4B6BFB', '#E6EAF0'], ['sans', 'sans'],
    ['Clean sans-serif, bold headlines, calm and readable.',
     'Split hero, a few raised panels. Use sparingly so not everything becomes a panel.',
     'Large radii, soft dual shadows, no borders. Keep text contrast accessible.',
     'Soft product renders on the same tinted background.',
     'Raised blue button.',
     'Hard borders, high-saturation colors, low-contrast text.'],
    [['calm', 'modern'], ['calm', 'trust'], ['mid'], ['pros', 'selfcare']],
    { hero: 'split', radius: 'lg', border: 'none', shadow: 'dual', weight: 'bold', list: 'cards', sections: 'plain', density: 'airy' }),

  mk('organic', 'Organic Wabi-Sabi', 'Moss green, terracotta and sand with organic shapes and quiet imperfection.',
    ['wellness', 'food', 'craft', 'fashion', 'personal'],
    ['#F1EBDD', '#E3D8C0', '#33402B', '#68735A', '#CFC3A6', '#556B3B', '#B4623A'], ['serif', 'humanist'],
    ['Soft regular-weight serif headlines, humanist sans body.',
     'Split hero with organic image shapes, open lists, warm alternating bands, plenty of space.',
     'Asymmetric large radii, very light shadows, no hard borders.',
     'Natural light, handmade textures, earthy tones.',
     'Moss pill button with cream text.',
     'Neon, sharp tech visuals, perfect symmetry.'],
    [['natural', 'calm', 'warm'], ['calm', 'belonging'], ['mid', 'premium'], ['selfcare', 'moms']],
    { hero: 'split', radius: 'lg', border: 'none', shadow: 'soft', weight: 'regular', list: 'open', button: 'pill', sections: 'bands', density: 'airy' }),

  mk('retrobloom', 'Retro Bloom', 'Warm retro boutique: sage, peach, mustard and cream with a vintage stationery feel.',
    ['craft', 'digital', 'kids', 'creative', 'fashion', 'food'],
    ['#FBF1DC', '#F6DDB8', '#3D3A2B', '#6C6850', '#E3CFA3', '#E0A526', '#8FAE8B'], ['serif', 'humanist'],
    ['Expressive retro serif headlines, small clean sans body.',
     'Centered airy hero, alternating open sections and warm bands, full-width offer band.',
     'Compact rounded rectangles in mustard, thin warm borders, no shadows.',
     'Warm natural-light product photography with a crafted feel.',
     'Mustard rounded rectangle, not a pill.',
     'Neon colors, cold corporate layouts, heavy gradients.'],
    [['warm', 'playful'], ['delight', 'belonging'], ['budget', 'mid'], ['moms', 'shoppers', 'beginners']],
    { hero: 'center', radius: 'md', border: 'thin', shadow: 'none', weight: 'bold', list: 'cards', sections: 'bands' }),

  mk('popweb', 'Playful Pop Web', 'Internet-culture energy: bubblegum pink, cyan and black type with sticker-like blocks.',
    ['community', 'course', 'creative', 'digital', 'tech'],
    ['#FFFFFF', '#FFE4F1', '#111111', '#444444', '#111111', '#FF5CAA', '#6FE7F2'], ['heavy', 'sans'],
    ['Oversized heavy sans headlines, compact readable body text.',
     'Color-block hero with an object-led image, clear white content zones and colorful section changes.',
     'Medium radius, medium black outlines, hard shadows used selectively.',
     'Cutout objects, creator portraits and nostalgic digital accessories.',
     'Pink rectangle with black outline and hard shadow.',
     'Random decoration, tiny low-contrast text, childish layouts for serious offers.'],
    [['bold', 'playful', 'modern'], ['excitement', 'delight', 'belonging'], ['budget', 'mid'], ['genz']],
    { hero: 'colorSplit', radius: 'md', border: 'medium', shadow: 'hard', weight: 'black', list: 'cards', sections: 'bands' }),

  mk('handmade', 'Whimsical Handmade', 'Cheerful craft-shop look: sage, burgundy, terracotta and butter yellow on cream.',
    ['craft', 'kids', 'food', 'digital', 'creative'],
    ['#FFF4E3', '#F6DFC6', '#4A2A2A', '#7E5C54', '#E5C9A8', '#9E2F3B', '#9DB59A'], ['slab', 'humanist'],
    ['Chunky characterful serif headlines with friendly sans body.',
     'Centered shop-banner hero, alternating colored panels, storytelling sections.',
     'Rounded panels, medium borders in warm brown, tactile paper feeling.',
     'Handmade product photography and consistent illustrations.',
     'Burgundy rectangle with cream text.',
     'Sterile corporate geometry, glossy tech effects, uniform cards.'],
    [['warm', 'playful', 'natural'], ['delight', 'belonging'], ['budget', 'mid'], ['moms', 'shoppers']],
    { hero: 'center', radius: 'lg', border: 'medium', shadow: 'none', weight: 'black', list: 'cards', sections: 'bands' })
);

let STYLES = BUILTIN_STYLES.slice();
const STYLE_BY_ID = {};
let customStyles = [];
function rebuildStyles() {
  STYLES = BUILTIN_STYLES.concat(customStyles);
  Object.keys(STYLE_BY_ID).forEach(function (k) { delete STYLE_BY_ID[k]; });
  STYLES.forEach(function (s) { STYLE_BY_ID[s.id] = s; });
}
rebuildStyles();
function getStyle(id) { return STYLE_BY_ID[id] || STYLES[0]; }

/* Copywriting formulas offered in Step 3. "use" goes into the prompt. */
const FORMULAS = [
  { id: 'aida', name: 'AIDA', steps: 'Attention, Interest, Desire, Action',
    desc: 'Classic flow for most pages. Good all-rounder.',
    use: 'AIDA: hook attention in the hero, build interest with the solution and benefits, create desire with the included items and proof, then ask for action with the offer and CTA.' },
  { id: 'pas', name: 'PAS', steps: 'Problem, Agitate, Solution',
    desc: 'Best when the audience feels a clear pain.',
    use: 'PAS: name the customer problem, describe honestly how it feels or what it costs them (no exaggeration or invented statistics), then present the product as the solution.' },
  { id: '4p', name: '4P', steps: 'Picture, Promise, Prove, Push',
    desc: 'Paint the outcome, promise it, back it up, then nudge.',
    use: '4P: Picture the desired outcome vividly, Promise how the product delivers it, Prove it using only real evidence supplied in this brief (contents, process, supplied proof), then Push gently toward the CTA.' },
  { id: 'fab', name: 'FAB', steps: 'Features, Advantages, Benefits',
    desc: 'Great for products with clear contents or specs.',
    use: 'FAB: for each feature stated in the brief, explain the advantage, then the benefit to the customer. Never add features that were not provided.' },
  { id: 'bab', name: 'BAB', steps: 'Before, After, Bridge',
    desc: 'Transformation stories and coaching or courses.',
    use: 'BAB: describe life Before, the realistic After, and the product as the Bridge. Keep the After modest and free of guaranteed results.' },
  { id: 'pastor', name: 'PASTOR', steps: 'Problem, Amplify, Story, Transformation, Offer, Response',
    desc: 'Long-form pages with a personal story.',
    use: 'PASTOR: Problem, Amplify the consequence, a short Story only from facts in this brief, Transformation, the Offer with the supplied prices, and a clear Response (CTA). Do not invent the story.' },
  { id: '4u', name: '4U (headlines)', steps: 'Useful, Urgent, Unique, Ultra-specific',
    desc: 'For sharpening the hero headline and subheads.',
    use: '4U for headlines: make each headline Useful, Unique and Ultra-specific. Only make it Urgent if a real deadline is supplied; otherwise skip urgency.' }
];

/* ---------------------------------------------------------------------
   PAGE FEATURES (Step 3). "lynk" tells how each one behaves on Lynk.id,
   which only allows inline CSS and no scripts:
     yes     = works as is
     simpler = a reduced version that needs no script
     no      = impossible without a <style> block, keyframes or JavaScript
   --------------------------------------------------------------------- */
const FEATURES = [
  { id: 'accordion', name: 'Accordion', desc: 'Answers open and close, usually in the FAQ.', lynk: 'yes',
    lynkNote: 'Uses the built-in <details> tag, so it works with inline CSS.',
    lynkUse: 'Accordion (FAQ): use <details><summary>Question</summary><div>Answer</div></details> with all styling inline. No JavaScript.',
    stdUse: 'Accordion (FAQ): use native <details>/<summary> elements styled with CSS. No JavaScript is needed.' },
  { id: 'fade', name: 'Fade-in on scroll', desc: 'Sections fade in softly as they come into view.', lynk: 'no',
    lynkNote: 'Needs JavaScript or keyframes, which Lynk.id does not allow. It will be left out.',
    lynkUse: '',
    stdUse: 'Fade-in on scroll: each section below the hero fades in and rises about 14px (opacity and transform, about 500ms) once, when it enters the viewport, using a small IntersectionObserver. Content must stay visible if JavaScript fails (add the hidden state with JavaScript only) and prefers-reduced-motion must disable it.' },
  { id: 'popup', name: 'Pop-up', desc: 'A small window opened by a button, for the offer or a reminder.', lynk: 'simpler',
    lynkNote: 'A real overlay needs JavaScript. You get a tap-to-open panel instead.',
    lynkUse: 'Pop-up (simpler version): a real overlay is not possible. Use a tap-to-open <details> panel styled as a small card that holds the pop-up content and the primary CTA. It must never open by itself.',
    stdUse: 'Pop-up: a native <dialog> opened by a visible button, with a close button, Esc to close, focus returning to the button, and content only from this brief. Never open it automatically on page load, and no exit-intent tricks or fake urgency.' },
  { id: 'progress', name: 'Progress bar', desc: 'A bar showing a real percentage, such as seats filled or course progress.', lynk: 'yes',
    lynkNote: 'Works as a static bar with the real percentage written in the inline width.',
    lynkUse: 'Progress bar: draw it with a nested <div> whose inline width equals the real percentage. Static, no animation. Use only the progress figures listed under "Real numbers"; if none are listed, skip it.',
    stdUse: 'Progress bar: a <div role="progressbar" aria-valuenow aria-valuemin aria-valuemax> whose fill width comes from the real percentage, with a text label. Use only the progress figures listed under "Real numbers"; if none are listed, skip it. No JavaScript is needed.' },
  { id: 'hover', name: 'Hover effects', desc: 'Buttons and cards react when the pointer moves over them.', lynk: 'no',
    lynkNote: 'Hover needs a <style> block, which Lynk.id does not allow. It will be left out.',
    lynkUse: '',
    stdUse: 'Hover and focus effects: a subtle lift or color shift on buttons and cards (transition 150 to 200ms) with matching :focus-visible styles for keyboard users. Never hide information behind hover, because touch screens cannot hover.' },
  { id: 'slider', name: 'Auto-sliding slider', desc: 'Testimonials or images that slide by themselves.', lynk: 'simpler',
    lynkNote: 'Auto-advance needs JavaScript. You get a swipe row instead.',
    lynkUse: 'Slider (simpler version): a horizontal swipe row with overflow-x: auto; scroll-snap-type: x mandatory; each slide flex: 0 0 85%; scroll-snap-align: start. No auto-advance. Use it for the testimonials and images listed in this brief; with fewer than two items skip it.',
    stdUse: 'Auto-sliding slider for the testimonials and images listed in this brief: a CSS scroll-snap track with previous and next buttons, auto-advance about every 4 to 5 seconds using small vanilla JavaScript, paused on hover, focus and touch, and stopped completely when prefers-reduced-motion is set. With fewer than two items skip it.' },
  { id: 'counter', name: 'Auto-counting numbers', desc: 'Numbers count up when they come into view.', lynk: 'simpler',
    lynkNote: 'Counting needs JavaScript. The numbers are shown already finished.',
    lynkUse: 'Auto-counting numbers (simpler version): counting is not possible without JavaScript, so show the final numbers statically in large type. Use only the counting figures listed under "Real numbers"; if none are listed, skip it.',
    stdUse: 'Auto-counting numbers: count from 0 up to each real figure once when it enters the viewport (about 1.5 seconds, vanilla JavaScript with requestAnimationFrame). The final value must already be in the HTML so it shows without JavaScript, and prefers-reduced-motion shows it immediately. Use only the counting figures listed under "Real numbers"; if none are listed, skip it.' },
  { id: 'floating', name: 'Floating button or text', desc: 'A button or short line that stays on screen while scrolling.', lynk: 'simpler',
    lynkNote: 'A sticky button inside the page. It may not stay in view on every Lynk.id layout, so test it.',
    lynkUse: 'Floating button (simpler version): position: sticky; bottom: 12px inside the root container, showing the primary CTA label and linking to the CTA URL. Do not use position: fixed. Tell me it may not stay in view on every Lynk.id layout and that I should test it.',
    stdUse: 'Floating CTA: a bar or button fixed to the bottom of the screen with the primary CTA label and, if it fits, one short line taken from this brief. It appears after the hero scrolls out of view, hides again when the final CTA is visible, never covers content (add bottom padding to the page) and respects the device safe area. No urgency claims.' }
];
const FEATURE_BY_ID = {};
FEATURES.forEach(function (f) { FEATURE_BY_ID[f.id] = f; });
/* Features that need JavaScript on a standard website. */
const JS_FEATURES = ['fade', 'popup', 'slider', 'counter', 'floating'];

/* Where each kind of extra image belongs on the page. */
const GALLERY_KINDS = [
  { id: 'product',    label: 'Product mockup or screenshot',   sec: 'included', secName: 'What\'s Included' },
  { id: 'bonus',      label: 'Bonus image',                    sec: 'bonus',    secName: 'Bonus' },
  { id: 'result',     label: 'Real result or before/after',    sec: 'benefits', secName: 'Benefits' },
  { id: 'author',     label: 'Photo of you or your team',      sec: 'solution', secName: 'Solution' },
  { id: 'credential', label: 'Real certificate or credential', sec: 'proof',    secName: 'Social Proof' },
  { id: 'other',      label: 'Other',                          sec: 'features', secName: 'Features' }
];
const GALLERY_KIND_BY_ID = {};
GALLERY_KINDS.forEach(function (k) { GALLERY_KIND_BY_ID[k.id] = k; });
const STAT_TYPES = [['count', 'Counting number'], ['progress', 'Progress bar (0 to 100)']];
const MAX_TESTIMONIALS = 6, MAX_GALLERY = 8, MAX_STATS = 4;

/* Text used inside the mockup (not the app UI). */
const L10N = {
  en: {
    sec: { problem: 'The problem', solution: 'The solution', benefits: 'Benefits', features: 'Features', how: 'How it works',
           included: 'What\'s included', proof: 'Social proof', numbers: 'In numbers', offer: 'Offer and pricing', bonus: 'Bonus', faq: 'Questions' },
    cta: { digital: 'Get the product', service: 'Book a consultation', leads: 'Join the list', brand: 'Get in touch',
           physical: 'Shop now', course: 'Join the course', other: 'Learn more' },
    forAudience: 'For ', yourProduct: 'Your product', placeholder: 'Content for this part will be written from your brief.',
    noPrice: 'No price entered yet.', noProof: 'No real proof provided. The prompt will tell Claude to skip this or use truthful trust elements.',
    step: 'Step', provided: 'Provided by you', imageArea: 'Product image area'
  },
  id: {
    sec: { problem: 'Masalahnya', solution: 'Solusinya', benefits: 'Manfaat', features: 'Fitur', how: 'Cara kerja',
           included: 'Isi paket', proof: 'Bukti sosial', numbers: 'Dalam angka', offer: 'Penawaran', bonus: 'Bonus', faq: 'Pertanyaan umum' },
    cta: { digital: 'Dapatkan Sekarang', service: 'Jadwalkan Konsultasi', leads: 'Daftar Sekarang', brand: 'Hubungi Saya',
           physical: 'Beli Sekarang', course: 'Gabung Sekarang', other: 'Pelajari Selengkapnya' },
    forAudience: 'Untuk ', yourProduct: 'Produk kamu', placeholder: 'Isi bagian ini akan ditulis dari brief kamu.',
    noPrice: 'Harga belum diisi.', noProof: 'Belum ada bukti nyata. Prompt akan meminta Claude melewati bagian ini atau memakai elemen kepercayaan yang jujur.',
    step: 'Langkah', provided: 'Dari kamu', imageArea: 'Area gambar produk'
  }
};

/* =====================================================================
   2. HELPERS
   ===================================================================== */

const $ = function (sel, root) { return (root || document).querySelector(sel); };
const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

/* Tiny DOM builder. Text is always added as text nodes, so user input
   can never become HTML. */
function el(tag, attrs) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'style') node.setAttribute('style', v);
      else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
  }
  for (let i = 2; i < arguments.length; i++) appendKids(node, arguments[i]);
  return node;
}
function appendKids(node, kid) {
  if (kid === null || kid === undefined || kid === false) return;
  if (Array.isArray(kid)) { kid.forEach(function (k) { appendKids(node, k); }); return; }
  node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function icon(name) {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVG_NS, 'use');
  u.setAttribute('href', '#i-' + name); s.appendChild(u);
  return s;
}

function uid() { return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
function nowISO() { return new Date().toISOString(); }
function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function clip(s, n) { s = String(s || '').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; }
function firstSentence(s) { s = String(s || '').trim(); const m = s.match(/^[\s\S]*?[.!?](\s|$)/); return (m ? m[0] : s).trim(); }
function capFirst(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function splitLines(s) {
  return String(s || '').split(/\r?\n|;/).map(function (x) { return x.replace(/^[-*•\d.)\s]+/, '').trim(); }).filter(Boolean);
}
function labelOf(list, id) { const f = list.filter(function (x) { return x[0] === id; })[0]; return f ? f[1] : ''; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }

function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj); }
function setPath(obj, path, val) {
  const keys = path.split('.'); const last = keys.pop();
  const target = keys.reduce(function (o, k) { if (typeof o[k] !== 'object' || o[k] === null) o[k] = {}; return o[k]; }, obj);
  target[last] = val;
}
function pathId(path) { return path.replace(/\./g, '-'); }

function validUrl(s) {
  try { const u = new URL(String(s).trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; }
}
function parseHex(s) {
  return (String(s || '').match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi) || []).map(function (h) {
    h = h.toLowerCase();
    return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
  });
}
function luminance(hex) {
  const c = [1, 3, 5].map(function (i) {
    const v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/* Picks black or white text, whichever has more contrast on this color. */
function readable(hex) {
  const l = luminance(hex);
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.05) ? '#FFFFFF' : '#111111';
}

/* ---- Brand colors: names and hex codes become one resolved palette ---- */
function rgbOf(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); }); }
function toHex(rgb) {
  return '#' + rgb.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
}
/* t = how much of b is mixed into a (0 to 1). */
function mixHex(a, b, t) {
  const x = rgbOf(a), y = rgbOf(b);
  return toHex([0, 1, 2].map(function (i) { return x[i] * (1 - t) + y[i] * t; }));
}
function satOf(hex) { const c = rgbOf(hex), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c); return mx ? (mx - mn) / mx : 0; }
function lc(h) { return String(h || '').toLowerCase(); }

/* Color words in Indonesian and English. Role: light = background candidate, dark = text candidate. */
const COLOR_NAMES = [
  [['putih tulang', 'off-white', 'off white'], '#F8F5EE', 'light'],
  [['putih', 'white'], '#FFFFFF', 'light'],
  [['krem', 'cream'], '#FAF3E3', 'light'],
  [['gading', 'ivory'], '#FBF7EA', 'light'],
  [['beige', 'pasir', 'sand'], '#E6D9BF', 'light'],
  [['abu muda', 'abu-abu muda', 'light gray', 'light grey'], '#E8EAEE', 'light'],
  [['hitam', 'black'], '#111111', 'dark'],
  [['arang', 'charcoal'], '#2B2B2B', 'dark'],
  [['abu-abu tua', 'abu tua', 'dark gray', 'dark grey'], '#4B5563', 'accent'],
  [['abu-abu', 'abu abu', 'abu', 'gray', 'grey'], '#8A919B', 'accent'],
  [['biru muda', 'biru langit', 'light blue', 'sky blue', 'baby blue'], '#5BC0EB', 'accent'],
  [['biru tua', 'biru dongker', 'biru navy', 'navy blue', 'navy', 'dark blue'], '#16335F', 'accent'],
  [['biru tosca', 'tosca', 'turquoise', 'teal', 'blue-teal', 'blue teal'], '#14A3A8', 'accent'],
  [['biru', 'blue'], '#2563EB', 'accent'],
  [['orange', 'oranye', 'jingga'], '#F97316', 'accent'],
  [['kuning muda', 'light yellow'], '#FDE68A', 'accent'],
  [['kuning', 'yellow'], '#FACC15', 'accent'],
  [['mustard', 'mustar'], '#D49A1A', 'accent'],
  [['emas', 'gold'], '#C9A24B', 'accent'],
  [['merah muda', 'pink'], '#F472B6', 'accent'],
  [['blush'], '#F6C9CF', 'accent'],
  [['hot pink', 'fuchsia', 'fuksia'], '#EC4899', 'accent'],
  [['merah marun', 'marun', 'maroon', 'burgundy'], '#7F1D2D', 'accent'],
  [['merah', 'red'], '#DC2626', 'accent'],
  [['peach', 'persik'], '#FFB68A', 'accent'],
  [['coral', 'koral'], '#FF7F6B', 'accent'],
  [['terracotta', 'terakota', 'bata'], '#C2693A', 'accent'],
  [['ungu muda', 'lavender', 'lilac', 'lila'], '#C4B5FD', 'accent'],
  [['ungu tua', 'plum'], '#5B2A6E', 'accent'],
  [['ungu', 'purple', 'violet'], '#7C3AED', 'accent'],
  [['hijau muda', 'light green', 'mint'], '#8EE0B0', 'accent'],
  [['hijau tua', 'dark green', 'forest green', 'hijau botol'], '#14532D', 'accent'],
  [['sage', 'hijau sage'], '#9CAF88', 'accent'],
  [['olive', 'zaitun'], '#6B7A2F', 'accent'],
  [['moss', 'lumut'], '#5A7240', 'accent'],
  [['hijau', 'green'], '#16A34A', 'accent'],
  [['coklat muda', 'cokelat muda', 'tan'], '#B08968', 'accent'],
  [['coklat tua', 'cokelat tua', 'dark brown'], '#4A2C1A', 'accent'],
  [['coklat', 'cokelat', 'brown'], '#7C4A2D', 'accent'],
  [['silver', 'perak'], '#C0C6CE', 'accent']
];
let COLOR_RE = null;
const COLOR_MAP = {};
function colorRe() {
  if (COLOR_RE) return COLOR_RE;
  const names = [];
  COLOR_NAMES.forEach(function (e) { e[0].forEach(function (n) { names.push(n); COLOR_MAP[n] = { hex: e[1], role: e[2], name: e[0][0] }; }); });
  names.sort(function (a, b) { return b.length - a.length; });
  const alt = names.map(function (n) { return n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); }).join('|');
  COLOR_RE = new RegExp('(#(?:[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-f]))|(?:^|[^a-z#])(' + alt + ')(?![a-z])', 'g');
  return COLOR_RE;
}
/* Returns [{ hex, label, role }] in the order the colors appear in the text. */
function parseColorText(s) {
  const text = String(s || '').toLowerCase().replace(/\s+/g, ' ');
  const re = colorRe(); re.lastIndex = 0;
  const found = []; let m;
  while ((m = re.exec(text))) {
    if (m[1]) {
      let h = m[1];
      if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
      const l = luminance(h), sat = satOf(h);
      found.push({ hex: h, label: h.toUpperCase(), role: (l > 0.8 && sat < 0.25) ? 'light' : (l < 0.02 ? 'dark' : 'accent') });
    } else if (COLOR_MAP[m[2]]) {
      const e = COLOR_MAP[m[2]];
      found.push({ hex: lc(e.hex), label: e.name, role: e.role });
    }
  }
  return found;
}
/* Sorts what was found into roles: accents in order, first light = background, first dark = text. */
function brandFromText(s) {
  const found = parseColorText(s), out = { accents: [], bg: '', surface: '', ink: '', found: found };
  found.forEach(function (c) {
    if (c.role === 'light') { if (!out.bg) out.bg = c.hex; else if (!out.surface && c.hex !== out.bg) out.surface = c.hex; }
    else if (c.role === 'dark') { if (!out.ink) out.ink = c.hex; }
    else if (out.accents.indexOf(c.hex) === -1) out.accents.push(c.hex);
  });
  return out;
}

/* One palette for the preview AND the prompt.
   Order of priority: color pickers, then colors read from the text, then the style's own palette.
   src[role] says where each color came from: brand, derived, adjusted or style. */
function resolvePalette(p, style) {
  const c = p.content, b = c.brand || {}, t = brandFromText(c.colors);
  const hexOf = function (v) { const h = normHex(v); return h ? lc(h) : ''; };
  const br = {
    accent: hexOf(b.primary) || t.accents[0] || '', accent2: hexOf(b.secondary) || t.accents[1] || '',
    bg: hexOf(b.background) || t.bg || '', ink: hexOf(b.text) || t.ink || '', surface: t.surface || ''
  };
  const pal = {}, src = {};
  Object.keys(style.palette).forEach(function (k) { pal[k] = lc(style.palette[k]); src[k] = 'style'; });
  let bgSet = false, inkSet = false;
  if (br.bg) { pal.bg = br.bg; src.bg = 'brand'; bgSet = true; }
  if (br.ink) { pal.ink = br.ink; src.ink = 'brand'; inkSet = true; }
  // Keep text readable whichever one the user changed.
  if (contrastRatio(pal.bg, pal.ink) < 4.5) {
    if (inkSet && !bgSet) { pal.bg = luminance(pal.ink) < 0.4 ? '#ffffff' : '#111111'; src.bg = 'adjusted'; bgSet = true; }
    else { pal.ink = luminance(pal.bg) > 0.4 ? '#1a1a1a' : '#f5f5f5'; src.ink = 'adjusted'; inkSet = true; }
  }
  if (bgSet || inkSet) {
    pal.surface = br.surface || mixHex(pal.bg, pal.ink, luminance(pal.bg) > 0.4 ? 0.06 : 0.12); src.surface = br.surface ? 'brand' : 'derived';
    pal.line = mixHex(pal.bg, pal.ink, 0.18); src.line = 'derived';
    let m = 0.42; pal.muted = mixHex(pal.ink, pal.bg, m);
    while (contrastRatio(pal.muted, pal.bg) < 4.5 && m > 0.1) { m -= 0.06; pal.muted = mixHex(pal.ink, pal.bg, m); }
    src.muted = 'derived';
  } else if (br.surface) { pal.surface = br.surface; src.surface = 'brand'; }
  if (br.accent) { pal.accent = br.accent; src.accent = 'brand'; }
  if (br.accent2) { pal.accent2 = br.accent2; src.accent2 = 'brand'; }
  else if (br.accent) { pal.accent2 = mixHex(br.accent, luminance(pal.bg) > 0.4 ? '#ffffff' : '#000000', 0.6); src.accent2 = 'derived'; }
  // Accent used as small text on the background needs 4.5:1; darken (or lighten) it toward the text color.
  let ai = pal.accent, m2 = 0;
  while (contrastRatio(ai, pal.bg) < 4.5 && m2 < 0.95) { m2 += 0.1; ai = mixHex(pal.accent, pal.ink, m2); }
  pal.accentInk = ai;
  let a2 = pal.accent2, m3 = 0;
  while (contrastRatio(a2, pal.bg) < 4.5 && m3 < 0.95) { m3 += 0.1; a2 = mixHex(pal.accent2, pal.ink, m3); }
  pal.accent2Ink = a2;
  return { pal: pal, src: src, found: t.found, hasBrand: !!(br.accent || br.accent2 || br.bg || br.ink), unreadable: !!c.colors.trim() && !t.found.length };
}
function srcText(s) {
  return s === 'brand' ? 'your color' : s === 'derived' ? 'derived from your colors' : s === 'adjusted' ? 'adjusted for readability' : 'style default';
}

/* =====================================================================
   3. PROJECT MODEL + STORAGE
   ===================================================================== */

const KEYS = { projects: 'lpps.projects.v1', settings: 'lpps.settings.v1', styles: 'lpps.styles.v1' };
const MAX_STORED_IMAGE_CHARS = 700000; // about 500 KB of image data

const state = {
  view: 'dashboard',
  projects: [],
  settings: { platform: 'lynk', language: 'id' },
  current: null,       // project being edited
  step: 1,
  viewport: 'desktop',
  previewShown: false,
  storageOK: true,
  galleryDetailId: null,
  saveTimer: null,
  dirty: false,
  lastSaved: null
};

function defaultSections(goal) {
  const on = GOAL_SECTIONS[goal] || GOAL_SECTIONS.other;
  return SECTION_DEFS.map(function (s) { return { id: s.id, enabled: on.indexOf(s.id) !== -1 }; });
}

function defaultProject() {
  const t = nowISO();
  return {
    id: uid(), name: '', createdAt: t, updatedAt: t, step: 1, maxStep: 1,
    brief: {
      productName: '', category: '', description: '', audience: '', problem: '', benefit: '',
      goal: '', goalOther: '', platform: state.settings.platform, language: state.settings.language,
      lynkPageType: 'product', outputFormat: 'multi'
    },
    design: {
      mode: 'style', styleId: '', baseStyleId: 'auto',
      referenceUrl: '', referenceNotes: '', referenceImage: '', referenceImageName: '',
      recommend: { personality: '', emotion: '', price: '', audience: '', results: [] }
    },
    content: {
      headline: '', regularPrice: '', promoPrice: '', ctaLabel: '', ctaUrl: '', colors: '', brandNotes: '',
      productImageUrl: '', socialProof: '', tone: 'auto', notes: '', formulas: [],
      brand: { primary: '', secondary: '', background: '', text: '' },
      logoUrl: '', testimonials: [], gallery: [], stats: [], features: ['accordion'], popupText: ''
    },
    sections: defaultSections('other'), sectionsCustomized: false,
    prompt: '', promptBase: '', promptEdited: false
  };
}

/* Merge saved data onto the defaults so old or damaged projects never crash the app. */
function deepMerge(base, over) {
  if (over === null || typeof over !== 'object' || Array.isArray(over)) return base;
  Object.keys(base).forEach(function (k) {
    if (!(k in over)) return;
    const b = base[k], o = over[k];
    if (Array.isArray(b)) { if (Array.isArray(o)) base[k] = o; }
    else if (b !== null && typeof b === 'object') { base[k] = deepMerge(b, o); }
    else if (typeof o === typeof b) { base[k] = o; }
  });
  return base;
}
function normalizeProject(raw) {
  const p = deepMerge(defaultProject(), raw);
  if (raw && typeof raw.id === 'string' && raw.id) p.id = raw.id;
  // Repair the section list: every known section exactly once.
  const seen = {}; const fixed = [];
  (Array.isArray(p.sections) ? p.sections : []).forEach(function (s) {
    if (s && SECTION_BY_ID[s.id] && !seen[s.id]) { seen[s.id] = true; fixed.push({ id: s.id, enabled: !!s.enabled }); }
  });
  SECTION_DEFS.forEach(function (d, di) {
    if (seen[d.id]) return;
    // Put a new section after the nearest earlier section that exists.
    let at = 0;
    for (let k = di - 1; k >= 0; k--) { const idx = fixed.map(function (x) { return x.id; }).indexOf(SECTION_DEFS[k].id); if (idx !== -1) { at = idx + 1; break; } }
    fixed.splice(at, 0, { id: d.id, enabled: false });
  });
  p.sections = fixed;
  const c = p.content, T = function (v, n) { return cleanText(v, n); }, U = function (v) { const x = String(v == null ? '' : v).trim().slice(0, 600); return x; };
  c.testimonials = (Array.isArray(c.testimonials) ? c.testimonials : []).filter(function (t) { return t && typeof t === 'object'; }).slice(0, MAX_TESTIMONIALS).map(function (t) {
    return { name: T(t.name, 80), role: T(t.role, 100), text: String(t.text == null ? '' : t.text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 800), photoUrl: U(t.photoUrl), shotUrl: U(t.shotUrl) };
  });
  c.gallery = (Array.isArray(c.gallery) ? c.gallery : []).filter(function (g) { return g && typeof g === 'object'; }).slice(0, MAX_GALLERY).map(function (g) {
    return { url: U(g.url), alt: T(g.alt, 140), kind: GALLERY_KIND_BY_ID[g.kind] ? g.kind : 'other' };
  });
  c.stats = (Array.isArray(c.stats) ? c.stats : []).filter(function (t) { return t && typeof t === 'object'; }).slice(0, MAX_STATS).map(function (t) {
    return { label: T(t.label, 60), value: T(t.value, 12), type: t.type === 'progress' ? 'progress' : 'count' };
  });
  c.features = (Array.isArray(c.features) ? c.features : []).filter(function (id, i, a) { return FEATURE_BY_ID[id] && a.indexOf(id) === i; });
  ['primary', 'secondary', 'background', 'text'].forEach(function (k) { const h = normHex(c.brand && c.brand[k]); c.brand[k] = h ? h.toLowerCase() : ''; });
  if (!Array.isArray(p.design.recommend.results)) p.design.recommend.results = [];
  p.design.recommend.results = p.design.recommend.results.filter(function (id) { return STYLE_BY_ID[id]; });
  if (p.design.styleId && !STYLE_BY_ID[p.design.styleId]) p.design.styleId = '';
  p.step = Math.min(6, Math.max(1, Number(p.step) || 1));
  p.maxStep = Math.min(6, Math.max(p.step, Number(p.maxStep) || 1));
  return p;
}

function storageGet(key) {
  try { return window.localStorage.getItem(key); } catch (e) { state.storageOK = false; return null; }
}
function storageSet(key, val) {
  try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
}
function storageRemove(key) { try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ } }

function detectStorage() {
  state.storageOK = storageSet('lpps.test', '1');
  storageRemove('lpps.test');
  $('#storage-warning').hidden = state.storageOK;
}

function loadSettings() {
  const raw = storageGet(KEYS.settings);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (s && (s.platform === 'lynk' || s.platform === 'standard')) state.settings.platform = s.platform;
    if (s && (s.language === 'id' || s.language === 'en')) state.settings.language = s.language;
  } catch (e) { /* use defaults */ }
}
function saveSettings() {
  if (!storageSet(KEYS.settings, JSON.stringify(state.settings))) { toast('Could not save settings: browser storage is unavailable.', 'error'); return false; }
  return true;
}

function loadProjects() {
  const raw = storageGet(KEYS.projects);
  if (!raw) return;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('not an array');
    state.projects = arr.filter(function (x) { return x && typeof x === 'object'; }).map(normalizeProject);
  } catch (e) {
    // Keep the damaged data under another key so nothing is silently destroyed.
    storageSet('lpps.projects.v1.damaged', raw);
    state.projects = [];
    toast('Saved project data could not be read. A backup copy was kept in this browser and the list was reset.', 'error', 8000);
  }
}

/* Writes all projects. Large images are not stored; they stay in memory for this session.
   Returns { ok, strippedImage }. */
function persist() {
  function serialize(stripAllImages) {
    return JSON.stringify(state.projects.map(function (p) {
      const big = p.design.referenceImage && (stripAllImages || p.design.referenceImage.length > MAX_STORED_IMAGE_CHARS);
      if (!big) return p;
      const copy = JSON.parse(JSON.stringify(Object.assign({}, p, { design: Object.assign({}, p.design, { referenceImage: '' }) })));
      return copy;
    }));
  }
  const memImages = state.projects.some(function (p) { return p.design.referenceImage && p.design.referenceImage.length > MAX_STORED_IMAGE_CHARS; });
  if (storageSet(KEYS.projects, serialize(false))) return { ok: true, strippedImage: memImages };
  if (storageSet(KEYS.projects, serialize(true))) return { ok: true, strippedImage: true };
  return { ok: false, strippedImage: false };
}

let warnedImage = false;
function saveNow() {
  clearTimeout(state.saveTimer); state.saveTimer = null;
  const p = state.current;
  if (p) {
    p.updatedAt = nowISO();
    if (state.projects.indexOf(p) === -1) state.projects.unshift(p);
  }
  const r = persist();
  state.dirty = false;
  if (r.ok) {
    state.lastSaved = new Date();
    if (r.strippedImage && !warnedImage) {
      warnedImage = true;
      toast('Your reference image is too large to save in this browser. It stays available until you reload; upload it again afterwards. The rest of the project was saved.', 'info', 9000);
    }
  } else {
    state.lastSaved = null;
    toast('Could not save: browser storage is unavailable or full. Your work is still on screen; copy your prompt before closing.', 'error', 8000);
  }
  updateSaveStatus(r.ok);
  return r.ok;
}
function scheduleSave() {
  state.dirty = true;
  updateSaveStatus(true);
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveNow, 600);
}
function flushSave() { if (state.dirty && state.current) saveNow(); }

function updateSaveStatus(ok) {
  const n = $('#save-status'); if (!n) return;
  if (!state.storageOK || ok === false) n.textContent = 'Not saved: browser storage is unavailable.';
  else if (state.dirty) n.textContent = 'Saving…';
  else if (state.lastSaved) n.textContent = 'Saved in this browser at ' + state.lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  else n.textContent = 'Not saved yet. Your project is saved after you type or continue.';
}

/* =====================================================================
   4. RULE-BASED RECOMMENDATION
   Scores each preset: +3 personality, +2 emotion, +2 price, +2 audience,
   +2 category. The reasons come straight from the rules that matched.
   ===================================================================== */

function computeRecommendations(p) {
  const a = p.design.recommend, cat = p.brief.category;
  const out = [];
  STYLES.forEach(function (s, idx) {
    let score = 0; const reasons = [];
    if (a.personality && s.fit.personality.indexOf(a.personality) !== -1) { score += 3; reasons.push('Fits a "' + labelOf(PERSONALITY, a.personality).toLowerCase() + '" brand personality.'); }
    if (a.emotion && s.fit.emotion.indexOf(a.emotion) !== -1) { score += 2; reasons.push('Supports the feeling of ' + labelOf(EMOTION, a.emotion).toLowerCase() + '.'); }
    if (a.price && s.fit.price.indexOf(a.price) !== -1) { score += 2; reasons.push('Works for ' + labelOf(PRICE, a.price).toLowerCase() + ' positioning.'); }
    if (a.audience && s.fit.audience.indexOf(a.audience) !== -1) { score += 2; reasons.push('Suits ' + labelOf(AUDIENCE, a.audience).toLowerCase() + '.'); }
    if (cat && s.categories.indexOf(cat) !== -1) { score += 2; reasons.push('Commonly used for "' + labelOf(CATEGORIES, cat).toLowerCase() + '".'); }
    if (score > 0) out.push({ style: s, score: score, reasons: reasons, idx: idx });
  });
  out.sort(function (x, y) { return y.score - x.score || x.idx - y.idx; });
  return out.slice(0, 3);
}

/* Which preset the mockup and prompt use. */
function resolveStyleId(p) {
  const d = p.design;
  if (d.mode === 'reference') {
    if (d.baseStyleId && d.baseStyleId !== 'auto' && STYLE_BY_ID[d.baseStyleId]) return d.baseStyleId;
    const rec = computeRecommendations({ design: { recommend: { personality: '', emotion: '', price: '', audience: '' } }, brief: p.brief });
    return rec[0] ? rec[0].style.id : 'serene';
  }
  if (d.styleId && STYLE_BY_ID[d.styleId]) return d.styleId;
  return 'serene';
}

/* =====================================================================
   5. VISUAL PREVIEW (HTML + CSS mockup built with safe DOM calls)
   ===================================================================== */

function sampleProject() {
  const p = defaultProject();
  p.brief.productName = 'Your Product';
  p.brief.description = 'A short supporting line about your product.';
  p.brief.audience = 'your audience';
  p.brief.benefit = 'First benefit\nSecond benefit\nThird benefit';
  p.brief.language = 'en'; p.brief.goal = 'digital';
  p.content.headline = 'A clear headline goes here';
  p.content.ctaLabel = 'Call to action';
  return p;
}

function getHeadline(p) {
  const b = p.brief, c = p.content, L = L10N[b.language] || L10N.en;
  const aud = b.audience ? L.forAudience + b.audience.trim() : '';
  if (c.headline.trim()) {
    return { text: c.headline.trim(), sub: clip(firstSentence(b.description) || aud, 170), draft: false };
  }
  const benefit = splitLines(b.benefit)[0];
  if (benefit) return { text: capFirst(clip(benefit, 90)), sub: clip(firstSentence(b.description) || aud, 170), draft: true };
  if (b.description.trim()) return { text: clip(firstSentence(b.description), 90), sub: aud, draft: true };
  return { text: b.productName.trim() || L.yourProduct, sub: aud, draft: true };
}

function skel(widths) {
  return el('div', { class: 'pv-sks', 'aria-hidden': 'true' }, widths.map(function (w) { return el('span', { class: 'pv-sk', style: 'width:' + w }); }));
}

function ctaLabel(p, L) { return p.content.ctaLabel.trim() || L.cta[p.brief.goal] || L.cta.other; }

function ctaButton(p, L) { return el('span', { class: 'pv-btn' }, ctaLabel(p, L)); }

function secShell(id, ctx, title, body) {
  return el('section', { class: 'pv-sec pv-' + id },
    el('div', { class: 'pv-inner' },
      el('p', { class: 'pv-kicker' }, pad2(ctx.num)),
      el('h2', { class: 'pv-h2' }, title),
      body,
      galleryBlock(ctx, id)));
}

function placeholderBlock(p, L, cls) {
  const name = (p.brief.productName || '').trim();
  return el('div', { class: 'pv-ph ' + (cls || '') },
    el('i', { class: 'd1' }), el('i', { class: 'd2' }), el('i', { class: 'd3' }),
    el('span', { class: 'pv-ph-mark' }, name ? name.charAt(0).toUpperCase() : 'P'),
    el('span', { class: 'pv-ph-label' }, L.imageArea));
}

function heroVisual(p, L) {
  const url = p.content.productImageUrl.trim();
  const holder = el('div', { class: 'pv-media' });
  if (url && validUrl(url)) {
    const img = el('img', { class: 'pv-img', src: url, alt: 'Product image from your URL', loading: 'lazy', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', function () { holder.textContent = ''; holder.append(placeholderBlock(p, L)); });
    holder.append(img);
  } else {
    holder.append(placeholderBlock(p, L));
  }
  return el('div', { class: 'pv-hero-visual' }, holder);
}

/* ---------- features, images and numbers inside the mockup ---------- */
/* How a chosen feature behaves on the current platform: 'off', 'simple' or 'full'. */
function fxMode(p, id) {
  const f = FEATURE_BY_ID[id];
  if (!f || (p.content.features || []).indexOf(id) === -1) return 'off';
  if (p.brief.platform !== 'lynk') return 'full';
  return f.lynk === 'yes' ? 'full' : f.lynk === 'simpler' ? 'simple' : 'off';
}
function safeImg(url, alt, cls) {
  const holder = el('div', { class: 'pv-figure ' + (cls || '') });
  const img = el('img', { class: 'pv-img2', src: url, alt: alt || '', loading: 'lazy', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', function () { holder.textContent = ''; holder.append(el('span', { class: 'pv-imgfail' }, 'Image could not be loaded from this link')); });
  holder.append(img);
  return holder;
}
/* Extra images the user placed in this section. */
function galleryBlock(ctx, secId) {
  const items = (ctx.p.content.gallery || []).filter(function (g) { return GALLERY_KIND_BY_ID[g.kind] && GALLERY_KIND_BY_ID[g.kind].sec === secId && validUrl(g.url); });
  if (!items.length) return null;
  return el('div', { class: 'pv-gallery' }, items.map(function (g) { return safeImg(g.url, g.alt, ''); }));
}
function testimonialCard(t) {
  const who = [t.name, t.role].filter(Boolean).join(', ');
  return el('figure', { class: 'pv-tm' },
    t.photoUrl && validUrl(t.photoUrl) ? el('div', { class: 'pv-tm-photo' }, safeImg(t.photoUrl, t.name ? 'Photo of ' + t.name : '', 'pv-avatar')) : null,
    el('blockquote', { class: 'pv-tm-text' }, t.text),
    who ? el('figcaption', { class: 'pv-tm-who' }, who) : null,
    t.shotUrl && validUrl(t.shotUrl) ? safeImg(t.shotUrl, 'Screenshot of the original message', 'pv-shot') : null);
}
function numFmt(v) { const n = Number(String(v).replace(',', '.')); return isFinite(n) ? String(n) : String(v); }
function statBlock(p, st, mode) {
  if (st.type === 'progress') {
    const pct = Math.max(0, Math.min(100, Number(st.value) || 0));
    if (fxMode(p, 'progress') === 'off') return el('div', { class: 'pv-stat' }, el('span', { class: 'pv-stat-num' }, numFmt(st.value) + '%'), el('span', { class: 'pv-stat-label' }, st.label));
    return el('div', { class: 'pv-stat pv-stat-bar' },
      el('div', { class: 'pv-stat-row' }, el('span', { class: 'pv-stat-label' }, st.label), el('span', { class: 'pv-stat-pct' }, numFmt(pct) + '%')),
      el('div', { class: 'pv-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': st.label },
        el('i', { style: 'width:' + pct + '%' })));
  }
  const num = el('span', { class: 'pv-stat-num pv-count', 'data-target': numFmt(st.value) }, numFmt(st.value));
  return el('div', { class: 'pv-stat' }, num, el('span', { class: 'pv-stat-label' }, st.label));
}

/* Preview effects that need a little script. Timers are cleared on every re-render. */
let fxTimers = [], fxObserver = null;
function clearFx() {
  fxTimers.forEach(function (t) { clearInterval(t); }); fxTimers = [];
  if (fxObserver) { fxObserver.disconnect(); fxObserver = null; }
}
function activateFx(frame) {
  clearFx();
  const pv = $('.pv', frame); if (!pv) return;
  const fx = (pv.dataset.fx || '').split(' ').filter(Boolean);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wantFade = fx.indexOf('fade') !== -1 && !reduce;
  const counters = fx.indexOf('counter') !== -1 && !reduce ? $$('.pv-count', pv) : [];
  if ((wantFade || counters.length) && typeof IntersectionObserver !== 'undefined') {
    if (wantFade) pv.classList.add('fx-ready');
    counters.forEach(function (c) { c.textContent = '0'; });
    fxObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        const t = en.target; fxObserver.unobserve(t);
        if (t.classList.contains('pv-count')) runCount(t); else t.classList.add('is-in');
      });
    }, { threshold: 0.15 });
    if (wantFade) $$('.pv-sec', pv).forEach(function (s) { if (!s.classList.contains('pv-hero')) fxObserver.observe(s); });
    counters.forEach(function (c) { fxObserver.observe(c); });
  }
  if (fx.indexOf('slider') !== -1 && !reduce) {
    $$('.pv-track[data-auto]', pv).forEach(function (track) {
      let paused = false;
      ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) { track.addEventListener(ev, function () { paused = true; }); });
      ['pointerleave', 'focusout'].forEach(function (ev) { track.addEventListener(ev, function () { paused = false; }); });
      fxTimers.push(setInterval(function () {
        if (paused || !track.isConnected || track.children.length < 2) return;
        const step = track.children[0].getBoundingClientRect().width + 12, max = track.scrollWidth - track.clientWidth;
        track.scrollTo({ left: track.scrollLeft + step > max + 2 ? 0 : track.scrollLeft + step, behavior: 'smooth' });
      }, 4500));
    });
  }
}
function runCount(node) {
  const target = parseFloat(node.dataset.target), dec = (node.dataset.target.split('.')[1] || '').length;
  if (!isFinite(target)) { node.textContent = node.dataset.target; return; }
  const t0 = performance.now(), dur = 1400;
  (function tick(now) {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    node.textContent = (target * e).toFixed(dec);
    if (k < 1) requestAnimationFrame(tick); else node.textContent = node.dataset.target;
  })(t0);
}
function popupMock(p, L) {
  const c = p.content, lynk = p.brief.platform === 'lynk';
  const box = el('div', { class: 'pm' });
  box.append(el('p', { class: 'pm-title' }, p.brief.productName.trim() || L.yourProduct));
  if (c.popupText.trim()) box.append(el('p', null, c.popupText.trim()));
  else box.append(el('p', { class: 'pm-note' }, 'No text entered. The pop-up will carry only the offer summary and the button.'));
  const price = c.promoPrice.trim() || c.regularPrice.trim();
  if (price) box.append(el('p', { class: 'pm-price' }, price));
  box.append(el('span', { class: 'pm-btn' }, ctaLabel(p, L)));
  if (lynk) box.append(el('p', { class: 'pm-note' }, 'On Lynk.id this becomes a tap-to-open panel inside the page, not a real overlay.'));
  return box;
}

const SECTION_RENDER = {
  hero: function (ctx) {
    const p = ctx.p, L = ctx.L, hl = getHeadline(p);
    return el('section', { class: 'pv-sec pv-hero' },
      el('div', { class: 'pv-hero-text' },
        el('p', { class: 'pv-eyebrow' }, p.brief.productName.trim() || L.yourProduct),
        el('h1', { class: 'pv-h1' }, hl.text),
        hl.sub ? el('p', { class: 'pv-lead' }, hl.sub) : null,
        el('div', { class: 'pv-cta-row' }, ctaButton(p, L))),
      heroVisual(p, L));
  },
  problem: function (ctx) {
    const body = ctx.p.brief.problem.trim()
      ? el('div', { class: 'pv-copy' }, ctx.p.brief.problem.trim().split(/\r?\n/).filter(Boolean).map(function (t) { return el('p', null, t); }))
      : el('div', { class: 'pv-copy' }, skel(['92%', '86%', '60%']), el('p', { class: 'pv-note' }, ctx.L.placeholder));
    return secShell('problem', ctx, ctx.L.sec.problem, body);
  },
  solution: function (ctx) {
    const b = ctx.p.brief;
    const body = b.description.trim()
      ? el('div', { class: 'pv-copy' }, el('p', null, b.description.trim()), b.audience.trim() ? el('p', { class: 'pv-aud' }, ctx.L.forAudience + b.audience.trim()) : null)
      : el('div', { class: 'pv-copy' }, skel(['90%', '70%']), el('p', { class: 'pv-note' }, ctx.L.placeholder));
    return secShell('solution', ctx, ctx.L.sec.solution, body);
  },
  benefits: function (ctx) {
    const lines = splitLines(ctx.p.brief.benefit).slice(0, 5);
    let items;
    if (lines.length) {
      items = lines.map(function (t, i) { return el('li', null, el('span', { class: 'pv-num' }, String(i + 1)), el('span', { class: 'pv-item-body' }, t)); });
    } else {
      items = [0, 1, 2].map(function (i) { return el('li', null, el('span', { class: 'pv-num' }, String(i + 1)), el('span', { class: 'pv-item-body' }, skel(['80%', '55%']))); });
    }
    return secShell('benefits', ctx, ctx.L.sec.benefits, el('div', null, el('ul', { class: 'pv-items' }, items), lines.length ? null : el('p', { class: 'pv-note' }, ctx.L.placeholder)));
  },
  features: function (ctx) {
    const items = [0, 1, 2].map(function (i) { return el('li', null, el('span', { class: 'pv-num' }, String(i + 1)), el('span', { class: 'pv-item-body' }, skel(['60%', '85%']))); });
    return secShell('features', ctx, ctx.L.sec.features, el('div', null, el('ul', { class: 'pv-items' }, items), el('p', { class: 'pv-note' }, ctx.L.placeholder)));
  },
  how: function (ctx) {
    const items = [0, 1, 2].map(function (i) { return el('li', null, el('span', { class: 'pv-num' }, String(i + 1)), el('span', { class: 'pv-item-body' }, skel(['70%', '50%']))); });
    return secShell('how', ctx, ctx.L.sec.how, el('div', null, el('ul', { class: 'pv-items pv-steps' }, items), el('p', { class: 'pv-note' }, ctx.L.placeholder)));
  },
  included: function (ctx) {
    const items = [0, 1, 2, 3].map(function () { return el('li', null, el('span', { class: 'pv-tick' }), el('span', { class: 'pv-item-body' }, skel(['75%']))); });
    return secShell('included', ctx, ctx.L.sec.included, el('div', null, el('ul', { class: 'pv-checks' }, items), el('p', { class: 'pv-note' }, ctx.L.placeholder)));
  },
  proof: function (ctx) {
    const c = ctx.p.content, t = c.socialProof.trim(), tms = c.testimonials.filter(function (x) { return x.text.trim(); });
    const kids = [];
    if (tms.length) {
      const mode = fxMode(ctx.p, 'slider');
      if (mode !== 'off' && tms.length > 1) {
        kids.push(el('div', { class: 'pv-track', tabindex: '0', role: 'group', 'aria-label': 'Testimonials', 'data-auto': mode === 'full' ? '1' : null },
          tms.map(function (x) { return el('div', { class: 'pv-slide' }, testimonialCard(x)); })));
        kids.push(el('p', { class: 'pv-note' }, mode === 'full' ? 'Slides by itself every few seconds and pauses on touch or hover.' : 'Swipe row (no auto-advance on Lynk.id).'));
      } else {
        kids.push(el('div', { class: 'pv-tms' }, tms.map(testimonialCard)));
      }
    }
    if (t) kids.push(el('div', { class: 'pv-copy pv-quote' }, t.split(/\r?\n/).filter(Boolean).map(function (x) { return el('p', null, x); })));
    if (tms.length || t) kids.push(el('p', { class: 'pv-note' }, ctx.L.provided));
    else kids.push(el('div', { class: 'pv-copy' }, skel(['88%', '64%']), el('p', { class: 'pv-note' }, ctx.L.noProof)));
    return secShell('proof', ctx, ctx.L.sec.proof, el('div', null, kids));
  },
  numbers: function (ctx) {
    const st = ctx.p.content.stats.filter(function (x) { return x.label.trim() && x.value.trim(); });
    const body = st.length
      ? el('div', { class: 'pv-stats' }, st.map(function (x) { return statBlock(ctx.p, x); }))
      : el('div', { class: 'pv-copy' }, skel(['60%', '40%']), el('p', { class: 'pv-note' }, 'No real numbers entered. Add them in Content, or switch this section off.'));
    return secShell('numbers', ctx, ctx.L.sec.numbers, body);
  },
  offer: function (ctx) {
    const c = ctx.p.content, price = el('div', { class: 'pv-price' });
    if (c.promoPrice.trim() && c.regularPrice.trim()) price.append(el('s', { class: 'pv-price-old' }, c.regularPrice.trim()), el('span', { class: 'pv-price-now' }, c.promoPrice.trim()));
    else if (c.promoPrice.trim() || c.regularPrice.trim()) price.append(el('span', { class: 'pv-price-now' }, (c.promoPrice || c.regularPrice).trim()));
    else price.append(skel(['34%']), el('p', { class: 'pv-note' }, ctx.L.noPrice));
    return secShell('offer', ctx, ctx.L.sec.offer, el('div', { class: 'pv-offer' }, price, el('div', { class: 'pv-cta-row' }, ctaButton(ctx.p, ctx.L))));
  },
  bonus: function (ctx) {
    const items = [0, 1].map(function () { return el('li', null, el('span', { class: 'pv-tick' }), el('span', { class: 'pv-item-body' }, skel(['65%']))); });
    return secShell('bonus', ctx, ctx.L.sec.bonus, el('div', null, el('ul', { class: 'pv-checks' }, items), el('p', { class: 'pv-note' }, ctx.L.placeholder)));
  },
  faq: function (ctx) {
    const acc = fxMode(ctx.p, 'accordion') !== 'off';
    const rows = [['72%'], ['58%'], ['66%']].map(function (w, i) {
      if (!acc) return el('div', { class: 'pv-faq-row' }, skel(w), el('i', { class: 'pv-plus' }));
      const ans = el('div', { class: 'pv-faq-a', id: 'pv-a' + i, hidden: true }, skel(['90%', '70%']));
      const btn = el('button', { type: 'button', class: 'pv-faq-row pv-faq-btn', 'aria-expanded': 'false', 'aria-controls': 'pv-a' + i }, skel(w), el('i', { class: 'pv-plus' }));
      btn.addEventListener('click', function () { const open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!open)); ans.hidden = open; btn.classList.toggle('is-open', !open); });
      return el('div', { class: 'pv-faq-item' }, btn, ans);
    });
    return secShell('faq', ctx, ctx.L.sec.faq, el('div', null, el('div', { class: 'pv-faq' }, rows), el('p', { class: 'pv-note' }, ctx.L.placeholder + (acc ? ' Tap a question to try the accordion.' : ''))));
  },
  final: function (ctx) {
    const p = ctx.p;
    return el('section', { class: 'pv-sec pv-final' },
      el('div', { class: 'pv-inner' },
        el('h2', { class: 'pv-h2' }, p.brief.productName.trim() || ctx.L.yourProduct),
        el('div', { class: 'pv-cta-row' }, ctaButton(p, ctx.L))));
  }
};

/* Recipe-driven styling: only whitelisted values become CSS variables or data attributes. */
const RECIPE_CSS = {
  radius:  { none: ['0px', '0px'], sm: ['4px', '3px'], md: ['10px', '8px'], lg: ['20px', '14px'], pill: ['28px', '14px'] },
  border:  { none: 0, thin: 1, medium: 2, thick: 3 },
  shadow:  { none: 'none', soft: '0 12px 32px rgba(0,0,0,.14)', hard: '6px 6px 0 var(--ink)', dual: '9px 9px 18px rgba(0,0,0,.16), -9px -9px 18px rgba(255,255,255,.75)' },
  weight:  { light: 300, regular: 400, bold: 700, black: 900 },
  caps:    { normal: 'none', upper: 'uppercase' },
  density: { tight: 0.75, normal: 1, airy: 1.35 }
};
function applyRecipe(pv, style) {
  const r = style.recipe;
  if (!r) return;
  const bw = RECIPE_CSS.border[r.border] || 0;
  pv.classList.add('is-recipe');
  pv.dataset.hero = r.hero; pv.dataset.list = r.list; pv.dataset.sec = r.sections; pv.dataset.btn = r.button;
  const v = {
    '--rad': RECIPE_CSS.radius[r.radius][0], '--bnr': RECIPE_CSS.radius[r.radius][1],
    '--bw': bw + 'px', '--bc': bw >= 2 ? 'var(--ink)' : 'var(--line)', '--bcb': bw >= 2 ? 'var(--ink)' : 'var(--accent)',
    '--shd': RECIPE_CSS.shadow[r.shadow], '--hw': String(RECIPE_CSS.weight[r.weight]),
    '--htf': RECIPE_CSS.caps[r.caps], '--pads': String(RECIPE_CSS.density[r.density])
  };
  Object.keys(v).forEach(function (k) { pv.style.setProperty(k, v[k]); });
}

/* Builds the full mockup element. opts: { style, thumb, only } */
function renderLanding(p, opts) {
  opts = opts || {};
  const style = opts.style || getStyle(resolveStyleId(p));
  const L = L10N[p.brief.language] || L10N.en;
  const wrap = el('div', { class: 'pv-wrap' });
  const pv = el('div', { class: 'pv s-' + style.id + (opts.thumb ? ' is-thumb' : '') });
  const res = resolvePalette(p, style), pal = res.pal;
  const lightBg = luminance(pal.bg) > 0.4;
  const vars = {
    '--bg': pal.bg, '--surface': pal.surface, '--ink': pal.ink, '--muted': pal.muted, '--line': pal.line,
    '--accent': pal.accent, '--accent2': pal.accent2, '--on-accent': readable(pal.accent), '--on-accent2': readable(pal.accent2),
    '--accent-ink': pal.accentInk, '--accent2-ink': pal.accent2Ink, '--on-ink': readable(pal.ink),
    '--card': lightBg ? mixHex(pal.bg, '#ffffff', 0.7) : pal.surface,
    '--tint': mixHex(pal.bg, pal.accent, lightBg ? 0.14 : 0.22), '--tint2': mixHex(pal.bg, pal.accent2, lightBg ? 0.2 : 0.26),
    '--display': stackOf(style.fonts.display), '--body': stackOf(style.fonts.body)
  };
  const fxOn = (p.content.features || []).filter(function (id) { return fxMode(p, id) === 'full'; });
  if (fxOn.length && !opts.thumb) pv.dataset.fx = fxOn.join(' ');
  Object.keys(vars).forEach(function (k) { pv.style.setProperty(k, vars[k]); });
  applyRecipe(pv, style);

  if (!opts.thumb) {
    const logo = p.content.logoUrl.trim();
    pv.append(el('header', { class: 'pv-top' },
      logo && validUrl(logo) ? safeImg(logo, (p.brief.productName.trim() || L.yourProduct) + ' logo', 'pv-logo') : el('span', { class: 'pv-brand' }, p.brief.productName.trim() || L.yourProduct),
      el('span', { class: 'pv-rule-dot' })));
  }
  const ids = opts.only || p.sections.filter(function (s) { return s.enabled; }).map(function (s) { return s.id; });
  let num = 0;
  ids.forEach(function (id) {
    if (!SECTION_RENDER[id]) return;
    if (id !== 'hero' && id !== 'final') num++;
    pv.append(SECTION_RENDER[id]({ p: p, L: L, style: style, num: num || 1 }));
  });
  if (!ids.length) pv.append(el('section', { class: 'pv-sec' }, el('p', { class: 'pv-note' }, 'No sections are switched on. Go to the Page Planner to enable some.')));
  if (!opts.thumb && fxMode(p, 'floating') !== 'off') {
    pv.append(el('div', { class: 'pv-float' }, el('span', { class: 'pv-btn' }, ctaLabel(p, L))));
  }
  wrap.append(pv);
  return wrap;
}

/* Small scaled preview used in the gallery. */
function makeThumb(style) {
  const inner = el('div', { class: 'thumb-inner' }, renderLanding(sampleProject(), { style: style, thumb: true, only: ['hero', 'benefits'] }));
  return el('div', { class: 'thumb', 'aria-hidden': 'true' }, inner);
}
function fitThumbs(root) {
  if (root._ro) { root._ro.disconnect(); root._ro = null; }
  const thumbs = $$('.thumb', root);
  if (typeof ResizeObserver === 'undefined') { thumbs.forEach(function (t) { t.firstChild.style.transform = 'scale(0.42)'; }); return; }
  const ro = new ResizeObserver(function (entries) {
    entries.forEach(function (en) {
      const w = en.contentRect.width;
      if (w > 0) en.target.firstChild.style.transform = 'scale(' + (w / 640) + ')';
    });
  });
  root._ro = ro;
  thumbs.forEach(function (t) { ro.observe(t); });
}

/* =====================================================================
   6. PROMPT GENERATION
   Pure function: project in, text out. No AI involved.
   ===================================================================== */

function goalLabel(p) {
  const b = p.brief;
  if (b.goal === 'other') return b.goalOther.trim() || 'Other (not described)';
  return labelOf(GOALS, b.goal) || 'Not specified';
}

const GOAL_FOCUS = {
  digital:  'Persuade visitors to buy or get access to the digital product.',
  service:  'Persuade visitors to book, enquire about or hire the service.',
  leads:    'Persuade visitors to leave their contact details or sign up.',
  brand:    'Present the person or brand clearly and invite visitors to connect or work together.',
  physical: 'Persuade visitors to buy the physical product.',
  course:   'Persuade visitors to join the course or membership.',
  other:    'Move visitors toward the main action described in the brief.'
};

function buildPrompt(p) {
  const b = p.brief, c = p.content, d = p.design;
  const style = getStyle(resolveStyleId(p));
  const lynk = b.platform === 'lynk';
  const maxW = b.lynkPageType === 'home' ? '800px' : '500px';
  const pageType = b.lynkPageType === 'home' ? 'Lynk.id home page' : 'Lynk.id digital product page';
  const lang = b.language === 'id' ? 'Indonesian (Bahasa Indonesia)' : 'English';
  const enabled = p.sections.filter(function (s) { return s.enabled; }).map(function (s) { return SECTION_BY_ID[s.id]; });
  const disabled = p.sections.filter(function (s) { return !s.enabled; }).map(function (s) { return SECTION_BY_ID[s.id].name; });
  const res = resolvePalette(p, style), pal = res.pal;
  const feats = (c.features || []).map(function (id) { return FEATURE_BY_ID[id]; }).filter(Boolean);
  const usable = feats.filter(function (f) { return fxMode(p, f.id) !== 'off'; });
  const dropped = feats.filter(function (f) { return fxMode(p, f.id) === 'off'; });
  const needJs = !lynk && usable.some(function (f) { return JS_FEATURES.indexOf(f.id) !== -1; });
  const testimonials = c.testimonials.filter(function (t) { return t.text.trim(); });
  const gallery = c.gallery.filter(function (g) { return validUrl(g.url); });
  const stats = c.stats.filter(function (x) { return x.label.trim() && x.value.trim(); });
  const hasProof = !!(c.socialProof.trim() || testimonials.length);
  const NA = 'Not provided. Do not invent it.';
  const out = [];
  const H = function (t) { out.push('', '## ' + t, ''); };
  const line = function (label, value, miss) { out.push('- ' + label + ': ' + (String(value || '').trim() ? String(value).trim() : (miss || NA))); };

  out.push('# Landing page build brief: ' + (p.name.trim() || b.productName.trim() || 'Untitled project'));

  /* 1 */
  H('1. Role and project context');
  out.push('You are a senior conversion-focused product designer, direct-response copywriter and front-end developer. Build ONE complete landing page for the project below.');
  out.push('');
  out.push('- Project: ' + (p.name.trim() || b.productName.trim()));
  out.push('- Platform: ' + (lynk ? 'Lynk.id (' + pageType + ')' : 'Standard website'));
  out.push('- Language of all visible page copy: ' + lang);
  out.push('- Work only from the facts in this brief. Where a fact is missing, follow the "do not invent" rules in section 7.');

  /* 2 */
  H('2. Product and audience brief');
  line('Product or business name', b.productName);
  line('Category', labelOf(CATEGORIES, b.category), 'Not specified.');
  line('Description', b.description);
  line('Target audience', b.audience);
  line('Main customer problem', b.problem, 'Not provided. Infer only a mild, general problem from the description, and do not add statistics or dramatic claims.');
  line('Main benefit or desired outcome', b.benefit, 'Not provided. Derive benefits only from the description above.');

  /* 3 */
  H('3. Landing page objective');
  out.push('- Goal: ' + goalLabel(p));
  out.push('- What the page must do: ' + (GOAL_FOCUS[b.goal] || GOAL_FOCUS.other));
  line('Primary call to action label', c.ctaLabel, 'Not provided. Propose one short, natural CTA label in the page language and use it consistently.');
  line('CTA destination URL', c.ctaUrl, 'Not provided. Use a clearly marked placeholder href such as "#cta-link-here" and tell me where to replace it.');

  /* 4 */
  H('4. Selected visual direction');
  out.push('- Direction: ' + style.name + ' (' + style.description + ')');
  if (d.mode === 'style') {
    out.push('- How it was chosen: selected by me from a preset gallery.');
  } else if (d.mode === 'recommend') {
    const a = d.recommend;
    out.push('- How it was chosen: I answered a short questionnaire and picked this from a rule-based shortlist.');
    out.push('- My answers: personality = ' + (labelOf(PERSONALITY, a.personality) || 'n/a') + '; impression = ' + (labelOf(EMOTION, a.emotion) || 'n/a') +
      '; price positioning = ' + (labelOf(PRICE, a.price) || 'n/a') + '; audience type = ' + (labelOf(AUDIENCE, a.audience) || 'n/a') + '.');
  } else {
    out.push('- How it was chosen: I supplied a visual reference. Use "' + style.name + '" only as the closest starting point.');
    line('Reference URL', d.referenceUrl, 'None.');
    line('What I like about the reference', d.referenceNotes, 'Not described.');
    out.push('- Reference screenshot: ' + (d.referenceImageName ? 'I will attach it to this chat (' + d.referenceImageName + '). Study it for palette, type contrast, spacing, image treatment and composition.' : 'None attached.'));
    out.push('- Use the reference as visual guidance only. Do not copy its brand name, logo, text, photographs, illustrations or code, and do not reproduce the page one-to-one. Capture the design language, not the assets.');
  }

  /* 5 */
  H('5. Visual system requirements');
  out.push('Let this style drive the composition, typography, shapes and spacing. Do not start from a generic template and recolor it.');
  out.push('');
  const srcTag = function (k) { return res.src[k] === 'brand' ? '' : res.src[k] === 'style' ? ' [style default]' : ' [' + srcText(res.src[k]) + ']'; };
  if (res.hasBrand) {
    out.push('- BRAND COLORS (mine, they override the style\'s default palette; use exactly these hex values for the page):');
    out.push('  - Background: ' + pal.bg.toUpperCase() + srcTag('bg'));
    out.push('  - Surface (cards, bands): ' + pal.surface.toUpperCase() + srcTag('surface'));
    out.push('  - Text: ' + pal.ink.toUpperCase() + srcTag('ink') + '; muted text: ' + pal.muted.toUpperCase() + srcTag('muted') + '; lines: ' + pal.line.toUpperCase() + srcTag('line'));
    out.push('  - Main accent (primary button, key highlights): ' + pal.accent.toUpperCase() + srcTag('accent') + '; text on it: ' + readable(pal.accent).toUpperCase());
    out.push('  - Second accent: ' + pal.accent2.toUpperCase() + srcTag('accent2') + '; text on it: ' + readable(pal.accent2).toUpperCase());
    out.push('  - When the main accent is used as TEXT on the background, use ' + pal.accentInk.toUpperCase() + ' so it stays readable.');
    if (c.colors.trim()) out.push('  - How I described them: "' + c.colors.trim() + '".');
    out.push('  - Do not reuse the style\'s own default colors anywhere; take the style only for type, shape, spacing and layout. Keep text contrast at WCAG AA (4.5:1) or better.');
  } else {
    out.push('- Suggested palette: background ' + pal.bg + ', surface ' + pal.surface + ', text ' + pal.ink + ', muted text ' + pal.muted +
      ', lines ' + pal.line + ', main accent ' + pal.accent + ', secondary accent ' + pal.accent2 + '.');
    if (c.colors.trim()) out.push('- Brand colors I described: "' + c.colors.trim() + '". I could not turn them into exact codes here, so translate them into suitable hex values yourself, use them in place of the suggested palette, and keep text contrast at WCAG AA or better.');
    else out.push('- Brand colors: none supplied. Use the suggested palette.');
  }
  out.push('- Typography: ' + style.typography);
  out.push('- Font stack: ' + stackOf(style.fonts.display) + ' for headings; ' + stackOf(style.fonts.body) + ' for body. Use these system font stacks only, with no web-font downloads.');
  out.push('- Layout: ' + style.layout);
  out.push('- Components and borders: ' + style.components);
  out.push('- Image treatment: ' + style.image);
  out.push('- CTA treatment: ' + style.cta);
  out.push('- Avoid: ' + style.avoid);
  out.push('- General: do not wrap every section in the same rounded card, do not add glow, glass or gradient effects the style does not call for, and use whitespace, rules and type to create hierarchy.');
  line('Brand notes', c.brandNotes, 'None.');

  /* 6 */
  H('6. Landing page structure and order');
  out.push('Build exactly these sections, in this order:');
  out.push('');
  enabled.forEach(function (s, i) { out.push((i + 1) + '. ' + s.name + ': ' + s.hint); });
  if (disabled.length) { out.push(''); out.push('Do not add these sections: ' + disabled.join(', ') + '.'); }
  out.push('Keep a clear path from hook to value, proof, offer and action.');

  /* 7 */
  H('7. Copywriting requirements');
  const tone = c.tone === 'casual' ? 'Casual, warm and conversational.' : c.tone === 'formal' ? 'Formal, professional and concise.' :
    'Match the audience described above. Warm and practical for parents and beginners; direct and efficient for professionals.';
  out.push('- Language: ' + lang + '. Tone: ' + tone);
  if (c.headline.trim()) out.push('- Headline idea from me: "' + c.headline.trim() + '". You may sharpen it, but keep its meaning.');
  else out.push('- Hero headline: write a specific, benefit-led headline that says what this is and who it is for, based only on the description and benefit above. Avoid vague lines such as "Unlock your potential".');
  const chosen = (c.formulas || []).map(function (id) { return FORMULAS.filter(function (f) { return f.id === id; })[0]; }).filter(Boolean);
  if (chosen.length) {
    out.push('- Copywriting formulas I chose (' + chosen.map(function (f) { return f.name; }).join(', ') + '). Blend them across the sections that exist, apply each where it fits, and do not print the formula names or step labels on the page:');
    chosen.forEach(function (f) { out.push('  - ' + f.use); });
  } else {
    out.push('- Frameworks: use AIDA for the overall flow from hero to offer. Use PAS inside the problem and solution sections if both are present. Use benefit-led wording for features. Apply each only where it fits; do not force all of them everywhere.');
  }
  out.push('- CTA hierarchy: one clear primary CTA style repeated at key points, quieter secondary actions, and text links last. Do not make every button look the same.');
  out.push('- Objection handling: answer likely doubts (who it is for, what is included, how access works, how to pay) using only facts from this brief. Where a fact is missing, write a clearly marked placeholder such as [to be confirmed] instead of guessing.');
  if (c.regularPrice.trim() || c.promoPrice.trim()) {
    out.push('- Pricing to show: ' + [c.regularPrice.trim() ? 'regular price ' + c.regularPrice.trim() : '', c.promoPrice.trim() ? 'promotional price ' + c.promoPrice.trim() : ''].filter(Boolean).join('; ') +
      '. Use these exact figures. ' + (c.regularPrice.trim() && c.promoPrice.trim() ? 'Show the regular price crossed out beside the promotional price.' : 'Do not add a crossed-out price.'));
  } else {
    out.push('- Pricing: no price was provided. Do not show or invent any price or discount. If an offer section exists, describe the offer without numbers and point to the CTA.');
  }
  if (testimonials.length) out.push('- Real testimonials: ' + testimonials.length + ' supplied in section 9. Use them word for word (only light formatting), never add, merge or embellish them.');
  if (c.socialProof.trim()) out.push('- Other real proof to use exactly as written (only light formatting allowed):\n' + c.socialProof.trim().split(/\r?\n/).map(function (x) { return '  > ' + x; }).join('\n'));
  if (!hasProof) out.push('- Social proof: none supplied. Do not write testimonials, reviews, customer counts or ratings. Omit the section or use truthful alternatives such as the product contents or the process.');
  if (stats.length) {
    out.push('- Real numbers I supplied (use exactly these, never round up, extend or add others):');
    stats.forEach(function (x) { out.push('  - ' + x.label.trim() + ': ' + x.value.trim() + (x.type === 'progress' ? '% (progress bar)' : ' (counting number)')); });
  } else out.push('- Numbers: none supplied. Do not invent statistics, customer counts, ratings, percentages or progress figures.');
  out.push('- Never invent: testimonials, customer counts, prices, discounts, guarantees, certifications, results, scarcity or urgency claims, deadlines, or any business fact not stated here.');
  line('Additional notes from me', c.notes, 'None.');

  /* 8 */
  H('8. Platform-specific technical constraints');
  if (lynk) {
    out.push('Target: ' + pageType + ' on Lynk.id.');
    out.push('');
    out.push('- Deliver complete HTML as ONE self-contained fragment starting with a single root <div>. No <html>, <head>, <body>, <script>, <style> or <link> tags.');
    out.push('- 100% inline CSS: every style goes in a style="" attribute. No <style> tag, no CSS classes that depend on a stylesheet.');
    out.push('- No external JavaScript, no frameworks, no web-font or CSS imports, no unnecessary external dependencies.');
    out.push('- Mobile-first. Root container: max-width ' + maxW + '; width: 100%; margin: 0 auto; box-sizing: border-box.');
    out.push('- No @keyframes, no marquee or scrolling-text animation, no CSS variables, no pseudo-elements, no hover or media-query rules. If an animation cannot be done safely inline, leave it out.');
    out.push('- Use simple, widely supported HTML and CSS that survives being embedded in another page. Do not use position: fixed or overflow tricks that could break the host layout.');
    out.push('- For FAQ use <details><summary>Question</summary><div>Answer</div></details> with all styling inline.');
    out.push('- Use only features that work in common mobile browsers. Keep the markup clean and commented only where it helps me edit it.');
  } else {
    out.push('Target: a standard website I will host or open locally.');
    out.push('');
    out.push('- Deliver complete HTML and CSS' + (needJs ? ' (plus JavaScript for the listed features)' : '') + (b.outputFormat === 'single' ? ' in ONE single HTML file with the CSS inside a <style> tag' + (needJs ? ' and the JavaScript inside a <script> tag.' : '.') : (needJs ? ' as three files: index.html, styles.css and script.js, linked with <link rel="stylesheet" href="styles.css"> and <script src="script.js" defer></script>.' : ' as two files: index.html and styles.css, linked with <link rel="stylesheet" href="styles.css">.')));
    out.push('- Semantic HTML: header, main, section with headings in logical order, footer. One h1 only.');
    out.push('- Responsive, mobile-first layout with min-width media queries. No horizontal scrolling at any width.');
    out.push('- Minimal dependencies: no frameworks, no CSS libraries, no build step. ' + (needJs ? 'JavaScript is allowed ONLY for the features listed below: plain vanilla JavaScript, no libraries, ' + (b.outputFormat === 'single' ? 'in one <script> before </body>.' : 'in script.js loaded with <script src="script.js" defer></script>.') + ' The page must still read and work without it.' : 'No JavaScript unless strictly needed (use <details> for the FAQ).'));
    out.push('- Use CSS custom properties for colors and spacing so I can edit them easily. Include visible focus styles and respect prefers-reduced-motion.');
    out.push('- ' + (b.outputFormat === 'single' ? 'A single file is preferred so I can save and open it immediately.' : 'Keep the file structure to exactly these files: ' + (needJs ? 'index.html, styles.css and script.js.' : 'index.html and styles.css.')));
  }

  out.push('');
  out.push('Page features and effects (these are the ONLY animated or interactive elements allowed' + (lynk ? ' on Lynk.id' : '') + '):');
  if (!feats.length) out.push('- None requested. Keep the page static and calm.');
  usable.forEach(function (f) { out.push('- ' + (lynk ? f.lynkUse : f.stdUse)); });
  if (dropped.length) out.push('- Left out on purpose because Lynk.id cannot do them with inline CSS only: ' + dropped.map(function (f) { return f.name; }).join(', ') + '. Do not try to imitate them.');
  if (usable.some(function (f) { return f.id === 'popup'; })) {
    out.push('- Pop-up content: ' + (c.popupText.trim() ? '"' + c.popupText.trim() + '" (use exactly), plus the offer summary and primary CTA.' : 'only the offer summary and the primary CTA, with nothing invented.'));
  }
  if (usable.length) out.push('- All effects are decoration only: no fake urgency, no fake live counters, no content that is available only through an effect.');

  /* 9 */
  H('9. Asset and image requirements');
  if (c.logoUrl.trim()) out.push('- Logo: use this URL in the page header or hero, at most 44px tall, with alt text "' + (b.productName.trim() || 'logo') + ' logo": ' + c.logoUrl.trim());
  else out.push('- Logo: none supplied. Use the business name as plain text; do not draw a logo.');
  if (c.productImageUrl.trim()) out.push('- Product image: use this URL in the hero or main visual with descriptive alt text: ' + c.productImageUrl.trim());
  else out.push('- Product image: none supplied. Use a typography-led composition or simple CSS/inline shapes. Do not insert unrelated stock photos or hotlink random images.');
  if (testimonials.length) {
    out.push('- Testimonials (real, use exactly as given in the social proof section):');
    testimonials.forEach(function (t, i) {
      out.push('  ' + (i + 1) + '. "' + t.text.trim().replace(/\s*\r?\n\s*/g, ' ') + '"' + (t.name || t.role ? ' by ' + [t.name, t.role].filter(Boolean).join(', ') : ' (no name given: do not add one)') +
        (validUrl(t.photoUrl) ? ' | photo: ' + t.photoUrl : ' | no photo: show no avatar and do not use a placeholder person') + (validUrl(t.shotUrl) ? ' | screenshot of the original message: ' + t.shotUrl : ''));
    });
  }
  if (gallery.length) {
    out.push('- Extra images (use each one once, in the section named):');
    gallery.forEach(function (g) {
      const k = GALLERY_KIND_BY_ID[g.kind] || GALLERY_KIND_BY_ID.other;
      out.push('  - ' + g.url + ' (' + k.label.toLowerCase() + ') goes in the ' + k.secName + ' section' + (g.alt ? '; alt text: "' + g.alt + '"' : '; write short alt text') + '. If that section is not on the page, put it in the nearest relevant one.');
    });
  }
  if (testimonials.length || gallery.length || c.logoUrl.trim() || c.productImageUrl.trim()) out.push('- Use ONLY the image links given in this section. Do not add, generate or hotlink any other image.');
  out.push('- Every image needs meaningful alt text, width: 100%, max-width: 100% and height: auto so it never overflows.');
  out.push('- Do not use logos, photos or illustrations that I have not provided.');
  if (d.mode === 'reference' && d.referenceImageName) out.push('- The reference screenshot is for visual guidance only; do not embed it in the page.');

  /* 10 */
  H('10. Responsive behavior');
  if (lynk) {
    out.push('- Design for 320px, 375px and 430px phone widths first, and check that it also looks right inside the ' + maxW + ' container on desktop.');
    out.push('- Use flexible widths (width: 100%, max-width) and padding in relative-friendly values. No fixed widths wider than the screen.');
  } else {
    out.push('- Start with a single-column mobile layout, then enhance at about 640px and 960px. Keep a comfortable reading width (about 65 characters) for body text.');
    out.push('- Test mentally at 320px, 375px, 768px and 1280px.');
  }
  out.push('- Buttons must be at least 44px tall and easy to tap. Headlines must scale down so they never overflow or collide.');

  /* 11 */
  H('11. Quality checklist');
  out.push('Before you answer, silently check every item and fix any failure:');
  out.push('');
  out.push('- [ ] The style is visibly recognizable and consistent in type, shape, color and imagery.');
  out.push('- [ ] The page does not rely on identical rounded cards repeated in every section.');
  out.push('- [ ] The hero says what it is, who it is for and what to do next within a few seconds.');
  out.push('- [ ] Only the sections listed in section 6 appear, in that order.');
  out.push('- [ ] No invented testimonials, numbers, prices, guarantees, certifications or urgency.');
  out.push('- [ ] Text contrast is at least 4.5:1 and the CTA stands out.');
  out.push('- [ ] No horizontal overflow at 320px.');
  out.push('- [ ] The page uses my brand colors from section 5' + (res.hasBrand ? ' and none of the style\'s default colors.' : ' (or the suggested palette if none were given).'));
  if (feats.length) out.push('- [ ] Only the effects listed in section 8 exist, and each one works as described' + (lynk ? ' without any script or style block.' : ', with prefers-reduced-motion respected.'));
  out.push(lynk ? '- [ ] 100% inline CSS, no <style>, no <script>, no keyframes, width limit ' + maxW + ' is applied.' :
    '- [ ] HTML is semantic, files match the requested structure, and JavaScript is ' + (needJs ? 'limited to the listed features.' : 'not used.'));

  /* 12 */
  H('12. Required output format');
  out.push('1. One short line naming the design direction you used.');
  if (lynk) out.push('2. The complete HTML in a single code block (language: html). Nothing outside the code block is part of the page.');
  else if (b.outputFormat === 'single') out.push('2. The complete single-file HTML in one code block (language: html).');
  else out.push('2. ' + (needJs ? 'Three code blocks, each labeled with its filename: index.html, styles.css and script.js.' : 'Two code blocks, each labeled with its filename: index.html and styles.css.'));
  out.push('3. A short list of any placeholders I must replace, such as links, prices or facts marked [to be confirmed].');
  out.push('4. The installation steps from section 13.');
  out.push('Do not add long explanations before or after the code.');

  /* 13 */
  H('13. Installation or usage instructions');
  out.push('After the code, give these steps in short form:');
  out.push('');
  if (lynk) {
    if (b.lynkPageType === 'home') {
      out.push('1. Log in to Lynk.id and open your home page editor.');
      out.push('2. Add a "Text" block and click the </> (HTML) button.');
      out.push('3. Paste the whole HTML, save, and preview it on a phone.');
    } else {
      out.push('1. In Lynk.id, open "Add Digital Product" (or edit an existing product).');
      out.push('2. Go to the description area and click the </> (HTML) button.');
      out.push('3. Paste the whole HTML, save, and preview it on a phone.');
    }
  } else if (b.outputFormat === 'single') {
    out.push('1. Copy the code into a text editor and save it as index.html.');
    out.push('2. Double-click the file to open it in your browser.');
    out.push('3. To publish, upload the file to any static hosting service.');
  } else {
    out.push('1. Create a new folder and save the ' + (needJs ? 'three files' : 'two files') + ' in it with the exact names ' + (needJs ? 'index.html, styles.css and script.js.' : 'index.html and styles.css.'));
    out.push('2. Double-click index.html to open it in your browser.');
    out.push('3. To publish, upload the whole folder to any static hosting service.');
  }
  out.push('');
  out.push('Start now and follow section 12 exactly.');
  return out.join('\n');
}

/* =====================================================================
   7. UI
   ===================================================================== */

/* =====================================================================
   STEP 3 EXTRAS: brand colors, images, numbers, page features
   ===================================================================== */
const BRAND_ROLES = [['primary', 'Main accent', 'accent'], ['secondary', 'Second accent', 'accent2'], ['background', 'Background', 'bg'], ['text', 'Text', 'ink']];

function currentResolved() { const p = state.current; return resolvePalette(p, getStyle(resolveStyleId(p))); }

function renderBrandPickers() {
  const p = state.current, box = $('#brand-pickers'); box.textContent = '';
  const res = currentResolved();
  BRAND_ROLES.forEach(function (r) {
    const id = 'bp-' + r[0], set = !!normHex(p.content.brand[r[0]]);
    const inp = el('input', { type: 'color', id: id, value: (set ? lc(normHex(p.content.brand[r[0]])) : res.pal[r[2]]) });
    const auto = el('button', { type: 'button', class: 'btn btn-small btn-quiet', id: id + '-auto', disabled: !set }, 'Use auto');
    inp.addEventListener('input', function () {
      p.content.brand[r[0]] = lc(inp.value); auto.disabled = false; renderBrandResolved(); scheduleSave();
    });
    auto.addEventListener('click', function () {
      p.content.brand[r[0]] = ''; auto.disabled = true; refreshPickerValues(); renderBrandResolved(); scheduleSave(); inp.focus();
    });
    box.append(el('div', { class: 'bp' }, el('label', { for: id }, r[1]), inp, auto));
  });
  renderBrandResolved();
}
/* Unset pickers follow the resolved palette so they always show what the preview uses. */
function refreshPickerValues() {
  const p = state.current; if (!p) return;
  const res = currentResolved();
  BRAND_ROLES.forEach(function (r) {
    const inp = $('#bp-' + r[0]); if (!inp) return;
    if (!normHex(p.content.brand[r[0]])) inp.value = res.pal[r[2]];
  });
}
function renderBrandResolved() {
  const p = state.current, box = $('#brand-resolved'); if (!box || !p) return;
  box.textContent = '';
  const res = currentResolved();
  if (p.content.colors.trim()) {
    if (res.found.length) {
      box.append(el('p', { class: 'small' }, el('strong', null, 'Read from your text: '),
        res.found.map(function (c, i) { return (i ? ', ' : '') + c.label + ' → ' + c.hex.toUpperCase(); }).join('')));
    } else {
      box.append(el('p', { class: 'small brand-warn' }, 'No known color name or hex code was found in your text, so the style\'s own colors are used. Try names like "biru muda, orange, putih" or hex codes like #5BC0EB, or use the pickers.'));
    }
  }
  const roles = [['bg', 'Background'], ['surface', 'Surface'], ['ink', 'Text'], ['accent', 'Main accent'], ['accent2', 'Second accent']];
  const ul = el('ul', { class: 'swatches' });
  roles.forEach(function (r) {
    ul.append(el('li', null, el('span', { class: 'sw', style: 'background:' + res.pal[r[0]] }), el('span', null, el('strong', null, r[1]), ' ', res.pal[r[0]].toUpperCase(), el('small', null, ' ' + srcText(res.src[r[0]])))));
  });
  box.append(ul);
}

/* ---- generic repeater (testimonials, images, numbers) ---- */
function renderRepeater(o) {
  const p = state.current, list = p.content[o.key], box = $(o.box); box.textContent = '';
  list.forEach(function (item, i) {
    const row = el('div', { class: 'rep-item' }, el('p', { class: 'rep-head' }, el('strong', null, o.noun + ' ' + (i + 1))));
    const grid = el('div', { class: 'form-grid inner-grid' });
    o.fields.forEach(function (f) {
      const id = 'f-content-' + o.key + '-' + i + '-' + f.key;
      let ctl;
      if (f.type === 'select') {
        ctl = el('select', { id: id }, f.options.map(function (op) { return el('option', { value: op[0] }, op[1]); }));
      } else if (f.type === 'textarea') {
        ctl = el('textarea', { id: id, rows: '3', placeholder: f.ph || '' });
      } else {
        ctl = el('input', { id: id, type: f.type || 'text', placeholder: f.ph || '', autocomplete: 'off', inputmode: f.type === 'url' ? 'url' : (f.type === 'number' ? 'decimal' : null) });
      }
      ctl.value = item[f.key] == null ? '' : item[f.key];
      const handler = function () {
        item[f.key] = ctl.value; ctl.removeAttribute('aria-invalid');
        const m = $('#e-content-' + o.key + '-' + i + '-' + f.key); if (m) m.hidden = true;
        if (o.after) o.after();
        scheduleSave();
      };
      ctl.addEventListener('input', handler); ctl.addEventListener('change', handler);
      grid.append(el('div', { class: 'field' + (f.wide ? ' full' : '') }, el('label', { for: id }, f.label), ctl,
        f.hint ? el('p', { class: 'hint' }, f.hint) : null, el('p', { class: 'field-error', id: 'e-content-' + o.key + '-' + i + '-' + f.key, hidden: true })));
    });
    row.append(grid, el('p', null, el('button', { type: 'button', class: 'btn btn-small btn-quiet btn-danger-text', 'aria-label': 'Remove ' + o.noun + ' ' + (i + 1),
      onclick: function () { list.splice(i, 1); if (o.after) o.after(); scheduleSave(); renderRepeater(o); const a = $(o.addBtn); if (a) a.focus(); toast(o.noun + ' removed.', 'ok', 1500); } }, 'Remove')));
    box.append(row);
  });
  const add = $(o.addBtn); if (add) add.disabled = list.length >= o.max;
  if (!list.length) box.append(el('p', { class: 'muted small' }, o.empty));
}
let REP = null;
function repDefs() {
  if (REP) return REP;
  REP = {
    tm: { key: 'testimonials', box: '#tm-list', addBtn: '#tm-add', noun: 'Testimonial', max: MAX_TESTIMONIALS, empty: 'No testimonials yet. Only add real ones.',
      blank: function () { return { name: '', role: '', text: '', photoUrl: '', shotUrl: '' }; },
      fields: [
        { key: 'text', label: 'What the customer said (exact words)', type: 'textarea', wide: true },
        { key: 'name', label: 'Name (as they allow)', ph: 'e.g. Sinta' },
        { key: 'role', label: 'Role or place (optional)', ph: 'e.g. ibu rumah tangga, Bandung' },
        { key: 'photoUrl', label: 'Photo URL (optional)', type: 'url', ph: 'https://' },
        { key: 'shotUrl', label: 'Screenshot of the original message (optional)', type: 'url', ph: 'https://' }
      ] },
    gal: { key: 'gallery', box: '#gal-list', addBtn: '#gal-add', noun: 'Image', max: MAX_GALLERY, empty: 'No extra images yet.',
      blank: function () { return { url: '', alt: '', kind: 'product' }; },
      fields: [
        { key: 'url', label: 'Image URL', type: 'url', ph: 'https://', wide: true },
        { key: 'kind', label: 'What is it, and where does it go?', type: 'select', options: GALLERY_KINDS.map(function (k) { return [k.id, k.label + ' → ' + k.secName]; }) },
        { key: 'alt', label: 'Short description (alt text)', ph: 'e.g. Ebook cover and sample pages' }
      ] },
    stat: { key: 'stats', box: '#stat-list', addBtn: '#stat-add', noun: 'Number', max: MAX_STATS, empty: 'No numbers yet. Leave empty if you have no true figures.',
      blank: function () { return { label: '', value: '', type: 'count' }; },
      after: function () { refreshFeatureWarn(); },
      fields: [
        { key: 'label', label: 'What it counts', ph: 'e.g. Modules, Students, Seats filled' },
        { key: 'value', label: 'Value', type: 'text', ph: 'e.g. 11 or 40' },
        { key: 'type', label: 'Show as', type: 'select', options: STAT_TYPES }
      ] }
  };
  return REP;
}
function renderRepeaters() { const d = repDefs(); Object.keys(d).forEach(function (k) { renderRepeater(d[k]); }); }
function addRepeaterItem(k) {
  const p = state.current, d = repDefs()[k], list = p.content[d.key];
  if (list.length >= d.max) return;
  list.push(d.blank());
  if (k === 'stat' && !p.sectionsCustomized) { const s = p.sections.filter(function (x) { return x.id === 'numbers'; })[0]; if (s) s.enabled = true; }
  scheduleSave(); renderRepeater(d); refreshFeatureWarn();
  const first = $('#f-content-' + d.key + '-' + (list.length - 1) + '-' + d.fields[0].key); if (first) first.focus();
}

/* ---- page features ---- */
function featureModeLabel(f, lynk) {
  if (!lynk) return ['ok', 'Works on a standard website'];
  return f.lynk === 'yes' ? ['ok', 'Works on Lynk.id'] : f.lynk === 'simpler' ? ['mid', 'Simpler version on Lynk.id'] : ['no', 'Not possible on Lynk.id'];
}
function renderFeatures() {
  const p = state.current, c = p.content, box = $('#feature-list'); box.textContent = '';
  const lynk = p.brief.platform === 'lynk';
  FEATURES.forEach(function (f) {
    const cb = el('input', { type: 'checkbox', id: 'fx-' + f.id }); cb.checked = c.features.indexOf(f.id) !== -1;
    cb.addEventListener('change', function () {
      c.features = cb.checked ? c.features.concat(f.id) : c.features.filter(function (x) { return x !== f.id; });
      scheduleSave(); refreshFeatureWarn(); $('#popup-field').hidden = c.features.indexOf('popup') === -1;
    });
    const m = featureModeLabel(f, lynk);
    box.append(el('label', { class: 'formula', for: 'fx-' + f.id }, cb,
      el('span', null, el('strong', null, f.name), el('em', { class: 'badge badge-' + m[0] }, m[1]), el('small', null, f.desc + (lynk && f.lynk !== 'yes' ? ' ' + f.lynkNote : '')))));
  });
  $('#popup-field').hidden = c.features.indexOf('popup') === -1;
  refreshFeatureWarn();
}
function refreshFeatureWarn() {
  const p = state.current, c = p.content, w = $('#feature-warn'); if (!w) return;
  const lynk = p.brief.platform === 'lynk', has = function (id) { return c.features.indexOf(id) !== -1; };
  const notes = [];
  c.features.forEach(function (id) {
    const f = FEATURE_BY_ID[id]; if (!f || !lynk) return;
    if (f.lynk === 'no') notes.push(f.name + ' will be left out: ' + f.lynkNote);
    else if (f.lynk === 'simpler') notes.push(f.name + ' will be simplified: ' + f.lynkNote);
  });
  if (has('counter') && !c.stats.some(function (s) { return s.type === 'count'; })) notes.push('Auto-counting numbers needs at least one "Counting number" in Real numbers, otherwise it is skipped.');
  if (has('progress') && !c.stats.some(function (s) { return s.type === 'progress'; })) notes.push('Progress bar needs at least one "Progress bar" number in Real numbers, otherwise it is skipped.');
  if (has('slider') && c.testimonials.length < 2) notes.push('Slider needs at least two testimonials, otherwise it is skipped.');
  w.textContent = '';
  if (notes.length) { w.append(el('ul', null, notes.map(function (n) { return el('li', null, n); }))); w.hidden = false; } else w.hidden = true;
}

function renderStep3Extras() {
  renderBrandPickers(); renderRepeaters(); renderFeatures();
}

/* ---- header logo with a safe fallback ---- */
function setupLogo() {
  const img = $('#brand-logo'), mark = $('#brand-mark'); if (!img) return;
  const fail = function () { img.hidden = true; if (mark) mark.hidden = false; };
  img.addEventListener('error', fail);
  setTimeout(function () { if (img.complete && img.naturalWidth === 0) fail(); }, 1500);
}

/* ---------- toast + dialog ---------- */
let toastTimer = null;
function toast(msg, kind, ms) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'toast toast-' + (kind || 'info'); t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, ms || 4500);
}

function openDialog(o) {
  return new Promise(function (resolve) {
    const dlg = $('#dlg');
    if (typeof dlg.showModal !== 'function') {
      if (o.label) { resolve(window.prompt(o.title + ' - ' + o.label, o.value || '')); } else { resolve(window.confirm(o.message || o.title)); }
      return;
    }
    $('#dlg-title').textContent = o.title;
    $('#dlg-msg').textContent = o.message || '';
    $('#dlg-msg').hidden = !o.message;
    const field = $('#dlg-field'), input = $('#dlg-input');
    field.hidden = !o.label;
    if (o.label) { $('#dlg-label').textContent = o.label; input.value = o.value || ''; }
    const ok = $('#dlg-ok');
    ok.textContent = o.okText || 'OK';
    ok.className = 'btn ' + (o.danger ? 'btn-danger' : 'btn-primary');
    function onKey(e) { if (e.key === 'Enter') { e.preventDefault(); dlg.close('ok'); } }
    input.addEventListener('keydown', onKey);
    dlg.addEventListener('close', function () {
      input.removeEventListener('keydown', onKey);
      const accepted = dlg.returnValue === 'ok';
      dlg.returnValue = '';
      if (o.label) resolve(accepted ? input.value.trim() : null); else resolve(accepted);
    }, { once: true });
    dlg.showModal();
    if (o.label) { input.focus(); input.select(); } else { $('#dlg-cancel').focus(); }
  });
}

/* ---------- views / navigation ---------- */
function showView(name, focus) {
  if (state.view === 'studio' && name !== 'studio') flushSave();
  state.view = name;
  $$('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + name; });
  $$('.nav-btn').forEach(function (b) {
    if (b.dataset.nav === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'gallery') { renderGallery(); showGalleryList(); }
  if (name === 'projects') renderProjects();
  if (name === 'settings') renderSettings();
  if (name === 'studio') renderStudio();
  window.scrollTo(0, 0);
  if (focus !== false) {
    const h = $('#view-' + name + ' h1[tabindex]');
    if (h && name !== 'gallery') h.focus({ preventScroll: true });
  }
}

/* ---------- project list rows (dashboard + projects) ---------- */
function projectRow(p, full) {
  const title = p.name.trim() || p.brief.productName.trim() || 'Untitled project';
  const meta = [p.brief.productName.trim(), p.brief.platform === 'lynk' ? 'Lynk.id' : 'Standard website', 'Step ' + p.step + ' of 6', 'Updated ' + fmtDate(p.updatedAt)].filter(Boolean).join(' · ');
  const actions = el('div', { class: 'row-actions' }, el('button', { type: 'button', class: 'btn btn-small', onclick: function () { openProject(p.id); } }, 'Open'));
  if (full) {
    actions.append(
      el('button', { type: 'button', class: 'btn btn-small btn-quiet', onclick: function () { renameProject(p.id); } }, 'Rename'),
      el('button', { type: 'button', class: 'btn btn-small btn-quiet', onclick: function () { duplicateProject(p.id); } }, 'Duplicate'),
      el('button', { type: 'button', class: 'btn btn-small btn-quiet btn-danger-text', onclick: function () { deleteProject(p.id); } }, 'Delete'));
  }
  return el('li', { class: 'row' }, el('div', { class: 'row-main' }, el('p', { class: 'row-title' }, title), el('p', { class: 'row-meta' }, meta)), actions);
}

function emptyState(text, sub, withButton) {
  return el('div', { class: 'empty' }, el('p', null, el('strong', null, text)), el('p', { class: 'muted' }, sub),
    withButton ? el('p', null, el('button', { type: 'button', class: 'btn btn-primary', onclick: newProject }, 'New Project')) : null);
}

function sortedProjects() { return state.projects.slice().sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); }); }

function renderDashboard() {
  const box = $('#dash-recent'); box.textContent = '';
  const list = sortedProjects().slice(0, 4);
  if (!list.length) { box.append(emptyState('No projects yet.', 'Start your first project. It takes about five minutes.', true)); return; }
  box.append(el('ul', { class: 'rows' }, list.map(function (p) { return projectRow(p, false); })));
  if (state.projects.length > 4) box.append(el('p', null, el('button', { type: 'button', class: 'btn btn-quiet', onclick: function () { showView('projects'); } }, 'See all ' + state.projects.length + ' projects')));
}

function renderProjects() {
  const box = $('#projects-list'); box.textContent = '';
  const list = sortedProjects();
  if (!list.length) { box.append(emptyState('Nothing saved yet.', 'Projects you create appear here, saved in this browser.', true)); return; }
  box.append(el('ul', { class: 'rows' }, list.map(function (p) { return projectRow(p, true); })));
}

function findProject(id) { return state.projects.filter(function (p) { return p.id === id; })[0]; }

function renameProject(id) {
  const p = findProject(id); if (!p) return;
  openDialog({ title: 'Rename project', label: 'Project name', value: p.name, okText: 'Rename' }).then(function (v) {
    if (v === null) return;
    if (!v) { toast('A project name cannot be empty.', 'error'); return; }
    p.name = v; p.updatedAt = nowISO(); saveNow(); renderProjects(); toast('Project renamed.', 'ok');
  });
}
function duplicateProject(id) {
  const p = findProject(id); if (!p) return;
  const copy = normalizeProject(JSON.parse(JSON.stringify(p)));
  copy.id = uid(); copy.name = (p.name || p.brief.productName || 'Untitled') + ' (copy)'; copy.createdAt = copy.updatedAt = nowISO();
  state.projects.unshift(copy);
  if (saveNow()) toast('Project duplicated.', 'ok');
  renderProjects();
}
function deleteProject(id) {
  const p = findProject(id); if (!p) return;
  openDialog({ title: 'Delete project?', message: '"' + (p.name || p.brief.productName || 'Untitled project') + '" will be removed from this browser. This cannot be undone.', okText: 'Delete', danger: true }).then(function (yes) {
    if (!yes) return;
    state.projects = state.projects.filter(function (x) { return x.id !== id; });
    if (state.current && state.current.id === id) state.current = null;
    state.dirty = false;
    if (persist().ok) toast('Project deleted.', 'ok'); else toast('Deleted on screen, but the change could not be saved.', 'error');
    renderProjects();
  });
}

function openProject(id) {
  const p = findProject(id); if (!p) return;
  flushSave();
  state.current = p; state.step = p.step; state.previewShown = false;
  showView('studio');
}
function newProject() {
  flushSave();
  state.current = defaultProject(); state.step = 1; state.previewShown = false;
  showView('studio');
}

/* ---------- settings ---------- */
function renderSettings() {
  $('#set-platform').value = state.settings.platform;
  $('#set-language').value = state.settings.language;
}

/* ---------- gallery ---------- */
function filteredStyles() {
  const q = $('#gallery-search').value.trim().toLowerCase(), cat = $('#gallery-category').value;
  return STYLES.filter(function (s) {
    const hay = (s.name + ' ' + s.description + ' ' + s.categories.map(function (c) { return labelOf(CATEGORIES, c); }).join(' ')).toLowerCase();
    return (!q || hay.indexOf(q) !== -1) && (!cat || s.categories.indexOf(cat) !== -1);
  });
}
function styleCard(s, opts) {
  opts = opts || {};
  const btn = el('button', { type: 'button', class: 'style-card' + (opts.selected ? ' is-selected' : ''), 'aria-pressed': opts.pressed ? String(!!opts.selected) : null, onclick: opts.onclick },
    makeThumb(s),
    el('span', { class: 'style-card-body' },
      el('span', { class: 'style-card-name' }, s.name, s.custom ? el('span', { class: 'chip chip-alt' }, 'Custom') : null, opts.selected ? el('span', { class: 'chip' }, 'Selected') : null),
      el('span', { class: 'style-card-desc' }, s.description)));
  return btn;
}
function renderGallery() {
  const grid = $('#gallery-grid'); grid.textContent = '';
  const list = filteredStyles();
  list.forEach(function (s) { grid.append(styleCard(s, { onclick: function () { showGalleryDetail(s.id); } })); });
  $('#gallery-empty').hidden = list.length > 0;
  $('#gallery-count').textContent = list.length + (list.length === 1 ? ' style' : ' styles') + ' shown';
  fitThumbs(grid);
}
function showGalleryList() { state.galleryDetailId = null; showGalleryPane('list'); }
function showGalleryDetail(id) {
  const s = getStyle(id); state.galleryDetailId = id;
  showGalleryPane('detail');
  $('#detail-custom').hidden = !s.custom;
  $('#detail-title').textContent = s.name; $('#detail-desc').textContent = s.description;
  const apply = $('#detail-apply');
  apply.textContent = state.current ? 'Apply to current project' : 'Start a project with this style';
  const prev = $('#detail-preview'); prev.textContent = '';
  prev.append(el('div', { class: 'pv-frame', 'data-vp': 'desktop' }, renderLanding(sampleProject(), { style: s, only: ['hero', 'benefits', 'how', 'offer', 'final'] })));
  const spec = $('#detail-spec'); spec.textContent = '';
  const rows = [
    ['Suitable for', s.categories.map(function (c) { return labelOf(CATEGORIES, c).replace(/ \(.*\)/, ''); }).join(', ')],
    ['Color palette', null],
    ['Typography', s.typography], ['Layout', s.layout], ['Components and borders', s.components],
    ['Image treatment', s.image], ['CTA treatment', s.cta], ['Avoid', s.avoid]
  ];
  rows.forEach(function (r) {
    spec.append(el('dt', null, r[0]));
    if (r[1] === null) {
      const roles = [['Background', 'bg'], ['Surface', 'surface'], ['Text', 'ink'], ['Muted', 'muted'], ['Lines', 'line'], ['Accent', 'accent'], ['Accent 2', 'accent2']];
      spec.append(el('dd', null, el('ul', { class: 'swatches' }, roles.map(function (x) {
        return el('li', null, el('span', { class: 'swatch', style: 'background:' + s.palette[x[1]] }), el('span', null, x[0] + ' ', el('code', null, s.palette[x[1]])));
      }))));
    } else spec.append(el('dd', null, r[1]));
  });
  window.scrollTo(0, 0); $('#detail-title').focus({ preventScroll: true });
}
function applyStyleToProject(id) {
  const isNew = !state.current;
  if (isNew) { flushSave(); state.current = defaultProject(); state.previewShown = false; }
  const p = state.current;
  p.design.mode = 'style'; p.design.styleId = id;
  scheduleSave();
  // A new project still needs its brief, so start at step 1. An existing one returns to Design.
  state.step = isNew ? 1 : 2; p.step = state.step; p.maxStep = Math.max(p.maxStep, state.step);
  showView('studio');
  toast(getStyle(id).name + (isNew ? ' is selected. Fill in your brief next.' : ' applied to this project.'), 'ok');
}

/* ---------- studio: forms ---------- */
function fillSelect(sel, pairs, emptyLabel) {
  sel.textContent = '';
  if (emptyLabel !== null) sel.append(el('option', { value: '' }, emptyLabel));
  pairs.forEach(function (x) { sel.append(el('option', { value: x[0] }, x[1])); });
}

function fillForm() {
  const p = state.current; if (!p) return;
  $$('[data-bind]').forEach(function (inp) {
    const v = getPath(p, inp.dataset.bind);
    inp.value = v === undefined || v === null ? '' : v;
  });
}

function updateConditional() {
  const p = state.current; if (!p) return;
  $$('[data-show-if]').forEach(function (n) {
    const parts = n.dataset.showIf.split('=');
    n.hidden = String(getPath(p, parts[0])) !== parts[1];
  });
}

function clearErrors() {
  $$('.field-error').forEach(function (n) { n.hidden = true; n.textContent = ''; });
  $$('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
  const s = $('#error-summary'); s.hidden = true; s.textContent = '';
}

function focusTarget(id) { return $('#f-' + id) || $('#' + id) || $('#e-' + id); }

function showErrors(errs) {
  clearErrors();
  if (!errs.length) return;
  errs.forEach(function (e) {
    const id = pathId(e.path), msg = $('#e-' + id), f = $('#f-' + id) || $('#' + id);
    if (msg) { msg.textContent = e.msg; msg.hidden = false; }
    if (f && f.setAttribute) { f.setAttribute('aria-invalid', 'true'); if (msg) f.setAttribute('aria-describedby', 'e-' + id); }
  });
  const s = $('#error-summary'); s.textContent = '';
  s.append(el('p', null, el('strong', null, errs.length === 1 ? 'One thing needs your attention:' : errs.length + ' things need your attention:')),
    el('ul', null, errs.map(function (e) {
      return el('li', null, el('button', { type: 'button', class: 'link-btn', onclick: function () { const t = focusTarget(pathId(e.path)); if (t && t.focus) t.focus(); } }, e.msg));
    })));
  s.hidden = false;
  const first = focusTarget(pathId(errs[0].path));
  if (first && first.focus && first.tagName !== 'P') first.focus(); else s.focus();
}

function validateStep(n) {
  const p = state.current, b = p.brief, d = p.design, c = p.content, errs = [];
  if (n === 1) {
    if (!p.name.trim()) errs.push({ path: 'name', msg: 'Enter a project name.' });
    if (!b.productName.trim()) errs.push({ path: 'brief.productName', msg: 'Enter the product or business name.' });
    if (!b.goal) errs.push({ path: 'brief.goal', msg: 'Choose a landing page goal.' });
    if (!b.description.trim()) errs.push({ path: 'brief.description', msg: 'Add a short product description.' });
    if (!b.audience.trim()) errs.push({ path: 'brief.audience', msg: 'Describe your target audience.' });
  }
  if (n === 2) {
    if (d.mode === 'style' && (!d.styleId || !STYLE_BY_ID[d.styleId])) errs.push({ path: 'design.styleId', msg: 'Select a style from the gallery.' });
    if (d.mode === 'recommend') {
      if (!d.recommend.results.length) errs.push({ path: 'design.recommend', msg: 'Answer the questions and choose "Show recommendations".' });
      else if (d.recommend.results.indexOf(d.styleId) === -1) errs.push({ path: 'design.recommend', msg: 'Choose one of the recommended styles.' });
    }
    if (d.mode === 'reference') {
      if (!d.referenceUrl.trim() && !d.referenceImageName && !d.referenceNotes.trim()) errs.push({ path: 'design.referenceNotes', msg: 'Add a reference URL, a screenshot or a few words about what you like.' });
      if (d.referenceUrl.trim() && !validUrl(d.referenceUrl)) errs.push({ path: 'design.referenceUrl', msg: 'The reference URL must start with http:// or https://.' });
    }
  }
  if (n === 3) {
    if (c.ctaUrl.trim() && !validUrl(c.ctaUrl)) errs.push({ path: 'content.ctaUrl', msg: 'The CTA URL must start with http:// or https://.' });
    if (c.productImageUrl.trim() && !validUrl(c.productImageUrl)) errs.push({ path: 'content.productImageUrl', msg: 'The product image URL must start with http:// or https://.' });
    if (c.logoUrl.trim() && !validUrl(c.logoUrl)) errs.push({ path: 'content.logoUrl', msg: 'The logo URL must start with http:// or https://.' });
    c.testimonials.forEach(function (t, i) {
      const k = 'content.testimonials.' + i + '.';
      if (!t.text.trim()) errs.push({ path: k + 'text', msg: 'Testimonial ' + (i + 1) + ': enter what the customer said, or remove it.' });
      if (t.photoUrl.trim() && !validUrl(t.photoUrl)) errs.push({ path: k + 'photoUrl', msg: 'Testimonial ' + (i + 1) + ': the photo URL must start with http:// or https://.' });
      if (t.shotUrl.trim() && !validUrl(t.shotUrl)) errs.push({ path: k + 'shotUrl', msg: 'Testimonial ' + (i + 1) + ': the screenshot URL must start with http:// or https://.' });
    });
    c.gallery.forEach(function (g, i) {
      if (!validUrl(g.url)) errs.push({ path: 'content.gallery.' + i + '.url', msg: 'Image ' + (i + 1) + ': enter a link that starts with http:// or https://, or remove it.' });
    });
    c.stats.forEach(function (x, i) {
      const k = 'content.stats.' + i + '.', v = Number(x.value.replace(',', '.'));
      if (!x.label.trim()) errs.push({ path: k + 'label', msg: 'Number ' + (i + 1) + ': say what it counts.' });
      if (!x.value.trim() || !isFinite(v) || v < 0) errs.push({ path: k + 'value', msg: 'Number ' + (i + 1) + ': enter a plain number such as 11 or 40.' });
      else if (x.type === 'progress' && v > 100) errs.push({ path: k + 'value', msg: 'Number ' + (i + 1) + ': a progress bar value must be between 0 and 100.' });
    });
  }
  if (n === 4) {
    if (!p.sections.some(function (s) { return s.enabled; })) errs.push({ path: 'sections', msg: 'Switch on at least one section.' });
  }
  return errs;
}

function onBindInput(e) {
  const t = e.target, path = t.dataset.bind, p = state.current;
  if (!path || !p) return;
  setPath(p, path, t.value);
  t.removeAttribute('aria-invalid');
  const m = $('#e-' + pathId(path)); if (m) m.hidden = true;
  if (path === 'brief.goal' && !p.sectionsCustomized) p.sections = defaultSections(t.value || 'other');
  if (path === 'name') $('#h-studio').textContent = t.value.trim() || 'New project';
  if (path.indexOf('design.recommend.') === 0 && p.design.recommend.results.length) {
    $('#e-design-recommend').textContent = 'Your answers changed. Choose "Show recommendations" again to refresh the list.';
    $('#e-design-recommend').hidden = false;
  }
  if (path === 'content.colors') { refreshPickerValues(); renderBrandResolved(); }
  updateConditional();
  scheduleSave();
}

/* ---------- studio: wizard shell ---------- */
function renderStudio() {
  const p = state.current;
  if (!p) { newProject(); return; }
  $('#h-studio').textContent = p.name.trim() || 'New project';
  fillForm(); updateConditional();
  showStep(state.step, false);
  updateSaveStatus(state.storageOK);
}

function renderProgress() {
  const p = state.current, ol = $('#progress'); ol.textContent = '';
  STEPS.forEach(function (label, i) {
    const n = i + 1, reachable = n <= p.maxStep;
    const b = el('button', { type: 'button', class: 'prog-btn', disabled: !reachable, 'aria-current': n === state.step ? 'step' : null, onclick: function () { if (n < state.step) { showStep(n); } else if (n > state.step) { tryGo(n); } } },
      el('span', { class: 'prog-num' }, String(n)), el('span', { class: 'prog-label' }, label));
    ol.append(el('li', { class: 'prog-item' + (n === state.step ? ' is-current' : '') + (n < state.step ? ' is-done' : '') }, b));
  });
}

/* Move forward only if every step in between is valid. */
function tryGo(target) {
  for (let s = state.step; s < target; s++) {
    const errs = validateStep(s);
    if (errs.length) { if (s !== state.step) showStep(s); showErrors(errs); return false; }
  }
  showStep(target); return true;
}

function showStep(n, focus) {
  const p = state.current;
  state.step = n; p.step = n; p.maxStep = Math.max(p.maxStep, n);
  $$('.step').forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
  clearErrors(); renderProgress(); fillForm(); updateConditional();
  if (n === 2) renderStep2();
  if (n === 3) { renderFormulas(); renderStep3Extras(); }
  if (n === 4) renderSections();
  if (n === 5) renderReview();
  if (n === 6) enterPrompt();
  $('#btn-back').hidden = n === 1;
  $('#btn-next').hidden = n === 6;
  $('#btn-next').textContent = n === 5 ? 'Generate Prompt' : 'Next';
  scheduleSave();
  window.scrollTo(0, 0);
  if (focus !== false) { const h = $('#h-step-' + n); if (h) h.focus({ preventScroll: true }); }
}

function goNext() {
  const errs = validateStep(state.step);
  if (errs.length) { showErrors(errs); return; }
  if (state.step < 6) showStep(state.step + 1);
}
function goBack() { if (state.step > 1) showStep(state.step - 1); }

/* ---------- step 2: design discovery ---------- */
function renderStep2() {
  const p = state.current, d = p.design;
  $$('input[name="designMode"]').forEach(function (r) { r.checked = r.value === d.mode; });
  $('#mode-style').hidden = d.mode !== 'style';
  $('#mode-reference').hidden = d.mode !== 'reference';
  $('#mode-recommend').hidden = d.mode !== 'recommend';
  if (d.mode === 'style') renderStylePicker();
  if (d.mode === 'reference') renderRefImage();
  if (d.mode === 'recommend') renderRecResults();
}
function renderStylePicker() {
  const d = state.current.design, box = $('#style-picker'); box.textContent = '';
  const q = ($('#picker-search').value || '').trim().toLowerCase();
  const shown = STYLES.filter(function (s) { return !q || (s.name + ' ' + s.description + ' ' + s.categories.map(function (c) { return labelOf(CATEGORIES, c); }).join(' ')).toLowerCase().indexOf(q) !== -1; });
  if (!shown.length) box.append(el('p', { class: 'muted' }, 'No styles match that search.'));
  shown.forEach(function (s) {
    box.append(styleCard(s, { pressed: true, selected: d.styleId === s.id, onclick: function () {
      d.mode = 'style'; d.styleId = s.id; $('#e-design-styleId').hidden = true; scheduleSave(); renderStylePicker();
      const again = $$('.style-card', $('#style-picker')).filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0]; if (again) again.focus();
    } }));
  });
  $('#style-selected').textContent = d.styleId ? 'Selected style: ' + getStyle(d.styleId).name : 'No style selected yet.';
  fitThumbs(box);
}
function renderRefImage() {
  const d = state.current.design, wrap = $('#ref-preview-wrap');
  if (d.referenceImage) {
    $('#ref-preview').src = d.referenceImage; $('#ref-meta').textContent = d.referenceImageName + ' (kept in this browser only)'; wrap.hidden = false;
  } else if (d.referenceImageName) {
    $('#ref-preview').removeAttribute('src');
    $('#ref-meta').textContent = d.referenceImageName + ' was used earlier but is no longer stored. Upload it again if you want to attach it to Claude.'; wrap.hidden = false;
  } else { wrap.hidden = true; }
  // The button only makes sense when there is something to remove.
}
function renderRecResults() {
  const p = state.current, d = p.design, box = $('#rec-results'); box.textContent = '';
  if (!d.recommend.results.length) return;
  const recs = computeRecommendations(p).filter(function (r) { return d.recommend.results.indexOf(r.style.id) !== -1; });
  const ordered = d.recommend.results.map(function (id) { return recs.filter(function (r) { return r.style.id === id; })[0]; }).filter(Boolean);
  const wrap = el('div', { class: 'rec-list' });
  ordered.forEach(function (r, i) {
    const selected = d.styleId === r.style.id;
    wrap.append(el('div', { class: 'rec' + (selected ? ' is-selected' : '') },
      makeThumb(r.style),
      el('div', { class: 'rec-body' },
        el('p', { class: 'rec-name' }, (i + 1) + '. ' + r.style.name, selected ? el('span', { class: 'chip' }, 'Selected') : null),
        el('p', { class: 'muted small' }, 'Rule score: ' + r.score),
        el('ul', { class: 'plain-list' }, r.reasons.map(function (t) { return el('li', null, t); })),
        el('button', { type: 'button', class: 'btn btn-small', 'aria-pressed': String(selected), onclick: function () {
          d.mode = 'recommend'; d.styleId = r.style.id; $('#e-design-recommend').hidden = true; scheduleSave(); renderRecResults();
        } }, selected ? 'Selected' : 'Use this style'))));
  });
  box.append(wrap);
  fitThumbs(box);
}
function runRecommend() {
  const p = state.current, a = p.design.recommend;
  const err = $('#e-design-recommend');
  if (!a.personality && !a.emotion && !a.price && !a.audience && !p.brief.category) {
    err.textContent = 'Answer at least one question first.'; err.hidden = false; return;
  }
  const recs = computeRecommendations(p);
  err.hidden = true;
  if (!recs.length) { err.textContent = 'No preset matched these answers. Try different answers or choose a style yourself.'; err.hidden = false; p.design.recommend.results = []; renderRecResults(); return; }
  p.design.recommend.results = recs.map(function (r) { return r.style.id; });
  if (p.design.styleId && p.design.recommend.results.indexOf(p.design.styleId) === -1 && p.design.mode === 'recommend') p.design.styleId = '';
  scheduleSave(); renderRecResults();
  toast(recs.length + (recs.length === 1 ? ' style' : ' styles') + ' matched your answers.', 'ok');
}

/* Reads, shrinks and previews the uploaded screenshot, all inside the browser. */
function handleRefFile(file) {
  const p = state.current, err = $('#e-ref-file');
  err.hidden = true;
  if (!file) return;
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) { err.textContent = 'Please choose a PNG, JPG, WEBP or GIF image.'; err.hidden = false; return; }
  if (file.size > 10 * 1024 * 1024) { err.textContent = 'That image is larger than 10 MB. Choose a smaller one.'; err.hidden = false; return; }
  const reader = new FileReader();
  reader.onerror = function () { err.textContent = 'The image could not be read.'; err.hidden = false; };
  reader.onload = function () {
    const img = new Image();
    img.onerror = function () { err.textContent = 'That file could not be opened as an image.'; err.hidden = false; };
    img.onload = function () {
      const max = 1000, scale = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      let data = ''; try { data = cv.toDataURL('image/jpeg', 0.72); } catch (e) { data = String(reader.result); }
      p.design.referenceImage = data; p.design.referenceImageName = file.name; warnedImage = false;
      renderRefImage(); saveNow();
      if (data.length > MAX_STORED_IMAGE_CHARS) toast('Image added. It is too large to save, so it will need to be uploaded again after a reload.', 'info', 7000);
      else toast('Reference image added. It stays in this browser.', 'ok');
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

/* ---------- step 3: copywriting formulas (checkboxes, max 3) ---------- */
function renderFormulas() {
  const c = state.current.content, box = $('#formula-list'); box.textContent = '';
  const err = $('#e-content-formulas'); err.hidden = true;
  const auto = el('input', { type: 'checkbox', id: 'fm-auto' }); auto.checked = c.formulas.length === 0;
  auto.addEventListener('change', function () { c.formulas = []; scheduleSave(); renderFormulas(); });
  box.append(el('label', { class: 'formula', for: 'fm-auto' }, auto, el('span', null, el('strong', null, 'Automatic'), el('small', null, 'AIDA for the overall flow, PAS where there is a clear problem.'))));
  FORMULAS.forEach(function (f) {
    const cb = el('input', { type: 'checkbox', id: 'fm-' + f.id }); cb.checked = c.formulas.indexOf(f.id) !== -1;
    cb.addEventListener('change', function () {
      if (cb.checked && c.formulas.length >= 3) { cb.checked = false; err.textContent = 'You can choose up to three formulas. Untick one first.'; err.hidden = false; return; }
      err.hidden = true;
      c.formulas = cb.checked ? c.formulas.concat(f.id) : c.formulas.filter(function (x) { return x !== f.id; });
      scheduleSave(); renderFormulas(); const again = $('#fm-' + f.id); if (again) again.focus();
    });
    box.append(el('label', { class: 'formula', for: 'fm-' + f.id }, cb, el('span', null, el('strong', null, f.name), el('em', null, f.steps), el('small', null, f.desc))));
  });
}

/* ---------- step 4: sections ---------- */
function renderSections() {
  const p = state.current, ul = $('#section-list'); ul.textContent = '';
  p.sections.forEach(function (s, i) {
    const def = SECTION_BY_ID[s.id];
    const cb = el('input', { type: 'checkbox', id: 'sec-' + s.id }); cb.checked = s.enabled;
    cb.addEventListener('change', function () { s.enabled = cb.checked; p.sectionsCustomized = true; $('#e-sections').hidden = true; scheduleSave(); renderSections(); const again = $('#sec-' + s.id); if (again) again.focus(); });
    const up = el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move ' + def.name + ' up', 'data-move': 'up', disabled: i === 0, onclick: function () { moveSection(i, -1, s.id); } }, icon('up'));
    const down = el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move ' + def.name + ' down', 'data-move': 'down', disabled: i === p.sections.length - 1, onclick: function () { moveSection(i, 1, s.id); } }, icon('down'));
    ul.append(el('li', { class: 'section-item' + (s.enabled ? '' : ' is-off') },
      el('span', { class: 'sec-index', 'aria-hidden': 'true' }, pad2(i + 1)),
      cb,
      el('label', { for: 'sec-' + s.id }, el('span', { class: 'sec-name' }, def.name), el('span', { class: 'sec-desc' }, def.desc)),
      el('span', { class: 'sec-move' }, up, down)));
  });
  const n = p.sections.filter(function (s) { return s.enabled; }).length;
  $('#sections-count').textContent = n + ' of ' + p.sections.length + ' sections on';
}
function moveSection(i, dir, id) {
  const p = state.current, j = i + dir;
  if (j < 0 || j >= p.sections.length) return;
  const t = p.sections[i]; p.sections[i] = p.sections[j]; p.sections[j] = t;
  p.sectionsCustomized = true; scheduleSave(); renderSections();
  const dirName = dir < 0 ? 'up' : 'down';
  const sel = '#sec-' + id;
  const li = $(sel).closest('li');
  let btn = $('[data-move="' + dirName + '"]', li);
  if (!btn || btn.disabled) btn = $('[data-move="' + (dir < 0 ? 'down' : 'up') + '"]', li);
  if (btn) btn.focus();
  toast(SECTION_BY_ID[id].name + ' moved to position ' + (j + 1) + '.', 'info', 1800);
}

/* ---------- step 5: review + preview ---------- */
function renderReview() {
  const p = state.current, b = p.brief, d = p.design, c = p.content;
  const style = getStyle(resolveStyleId(p));
  const modeText = d.mode === 'style' ? 'chosen from the gallery' : d.mode === 'recommend' ? 'picked from rule-based recommendations' : 'closest preset to your reference';
  const enabled = p.sections.filter(function (s) { return s.enabled; }).map(function (s) { return SECTION_BY_ID[s.id].name; });
  const rows = [
    ['Project', p.name.trim()],
    ['Product', b.productName.trim() + (b.category ? ' (' + labelOf(CATEGORIES, b.category).replace(/ \(.*\)/, '') + ')' : '')],
    ['Audience', b.audience.trim()],
    ['Goal', goalLabel(p)],
    ['Platform', b.platform === 'lynk' ? (b.lynkPageType === 'home' ? 'Lynk.id home page (about 800px)' : 'Lynk.id product page (about 500px)') : 'Standard website, ' + (b.outputFormat === 'single' ? 'single HTML file' : 'index.html + styles.css')],
    ['Page language', b.language === 'id' ? 'Indonesian' : 'English'],
    ['Visual style', style.name + ' (' + modeText + ')'],
    ['Sections', enabled.length ? enabled.join(' → ') : 'None'],
    ['Copy formula', c.formulas.length ? c.formulas.map(function (id) { return FORMULAS.filter(function (f) { return f.id === id; })[0].name; }).join(', ') : 'Automatic (AIDA with PAS where it fits)'],
    ['Main CTA', (c.ctaLabel.trim() || 'Label not set') + (c.ctaUrl.trim() ? ' → ' + c.ctaUrl.trim() : ' (no URL)')]
  ];
  const dl = $('#summary'); dl.textContent = '';
  rows.forEach(function (r) { dl.append(el('dt', null, r[0]), el('dd', null, r[1] || 'Not set')); });

  const assets = [];
  if (d.referenceImage) assets.push('Reference screenshot: ' + d.referenceImageName);
  else if (d.referenceImageName) assets.push('Reference screenshot: ' + d.referenceImageName + ' (needs re-upload)');
  if (d.referenceUrl.trim()) assets.push('Reference URL: ' + d.referenceUrl.trim());
  if (c.productImageUrl.trim()) assets.push('Product image URL: ' + c.productImageUrl.trim());
  if (c.logoUrl.trim()) assets.push('Logo URL: ' + c.logoUrl.trim());
  if (c.colors.trim() || c.brand.primary || c.brand.secondary || c.brand.background || c.brand.text) {
    const rp = resolvePalette(p, style).pal;
    assets.push('Brand colors in use: background ' + rp.bg.toUpperCase() + ', text ' + rp.ink.toUpperCase() + ', accent ' + rp.accent.toUpperCase() + ', accent 2 ' + rp.accent2.toUpperCase());
  }
  if (c.testimonials.length) assets.push(c.testimonials.length + ' testimonial' + (c.testimonials.length > 1 ? 's' : '') + (c.testimonials.some(function (t) { return t.photoUrl.trim() || t.shotUrl.trim(); }) ? ' (with images)' : ''));
  if (c.gallery.length) assets.push(c.gallery.length + ' extra image' + (c.gallery.length > 1 ? 's' : ''));
  if (c.stats.length) assets.push(c.stats.length + ' real number' + (c.stats.length > 1 ? 's' : ''));
  if (c.features.length) assets.push('Features: ' + c.features.map(function (id) { return FEATURE_BY_ID[id].name; }).join(', '));
  if (c.socialProof.trim()) assets.push('Real social proof text');
  const al = $('#assets-list'); al.textContent = '';
  (assets.length ? assets : ['No assets added yet.']).forEach(function (t) { al.append(el('li', null, t)); });

  const on = function (id) { return p.sections.some(function (s) { return s.id === id && s.enabled; }); };
  const missing = [];
  if (!b.problem.trim()) missing.push('Main customer problem');
  if (!b.benefit.trim()) missing.push('Main benefit');
  if (!c.headline.trim()) missing.push('Headline idea (a draft is used in the preview)');
  if (!c.ctaLabel.trim()) missing.push('CTA label (a default is shown in the preview)');
  if (!c.ctaUrl.trim()) missing.push('CTA destination URL');
  if (on('offer') && !c.regularPrice.trim() && !c.promoPrice.trim()) missing.push('Price (offer section is on)');
  if (on('proof') && !c.socialProof.trim() && !c.testimonials.length) missing.push('Real social proof or testimonials (section is on)');
  if (c.testimonials.length && !on('proof')) missing.push('Testimonials are added but the Social Proof section is off');
  if (c.stats.length && !on('numbers')) missing.push('Numbers are added but the Numbers section is off');
  if (on('numbers') && !c.stats.length) missing.push('Real numbers (Numbers section is on)');
  if (c.features.length && p.brief.platform === 'lynk') {
    const lost = c.features.filter(function (id) { return FEATURE_BY_ID[id].lynk !== 'yes'; }).map(function (id) { return FEATURE_BY_ID[id].name + (FEATURE_BY_ID[id].lynk === 'no' ? ' (left out)' : ' (simplified)'); });
    if (lost.length) missing.push('On Lynk.id: ' + lost.join(', '));
  }
  if (!c.productImageUrl.trim()) missing.push('Product image URL');
  if (!c.colors.trim() && !c.brand.primary && !c.brand.background) missing.push('Brand colors (the style\'s own colors are used)');
  const ml = $('#missing-list'); ml.textContent = '';
  (missing.length ? missing : ['Nothing important is missing.']).forEach(function (t) { ml.append(el('li', null, t)); });

  $('#preview-block').hidden = !state.previewShown;
  if (state.previewShown) renderPreviewPanel();
}
function renderPreviewPanel() {
  const p = state.current, frame = $('#preview-frame');
  frame.textContent = ''; frame.dataset.vp = state.viewport;
  frame.append(renderLanding(p));
  activateFx(frame);
  $('#btn-pv-popup').hidden = fxMode(p, 'popup') === 'off';
  const hl = getHeadline(p);
  $('#preview-notes').textContent = (hl.draft ? 'The headline is a draft built from your description and benefit. It is editable copy, not final text. ' : '') +
    'Grey bars mark content Claude will write from your brief. Nothing here is real proof, pricing or results unless you entered it.';
  $$('.seg-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.vp === state.viewport)); });
}
function generatePreview() {
  state.previewShown = true; $('#preview-block').hidden = false; renderPreviewPanel();
  $('#preview-block').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

/* ---------- step 6: prompt workspace ---------- */
function updatePromptStats() {
  const v = $('#prompt-text').value;
  const words = v.trim() ? v.trim().split(/\s+/).length : 0;
  $('#prompt-stats').textContent = v.length + ' characters · ' + words + ' words';
}
function setStatus(msg, kind) { const n = $('#copy-status'); n.textContent = msg; n.className = 'status status-' + (kind || 'info'); }
function enterPrompt() {
  const p = state.current, ta = $('#prompt-text'), notice = $('#prompt-notice');
  notice.hidden = true; setStatus('', 'info');
  const fresh = buildPrompt(p);
  if (!p.prompt || !p.promptEdited) { p.prompt = fresh; p.promptBase = fresh; p.promptEdited = false; }
  else if (p.promptBase !== fresh) {
    notice.textContent = 'Your project changed after this prompt was generated. Your edited prompt was kept. Choose Regenerate Prompt to rebuild it from the current project data (this replaces your edits).';
    notice.hidden = false;
  }
  ta.value = p.prompt; updatePromptStats();
  const note = $('#attach-note');
  if (p.design.mode === 'reference' && p.design.referenceImageName) {
    note.textContent = 'Reminder: attach your reference screenshot (' + p.design.referenceImageName + ') to the Claude chat yourself. The prompt cannot carry the image.'; note.hidden = false;
  } else note.hidden = true;
}
function regeneratePrompt() {
  const p = state.current;
  const doIt = function () {
    const fresh = buildPrompt(p); p.prompt = fresh; p.promptBase = fresh; p.promptEdited = false;
    $('#prompt-text').value = fresh; $('#prompt-notice').hidden = true; updatePromptStats(); scheduleSave();
    setStatus('Prompt regenerated from the current project data.', 'ok');
  };
  if (p.promptEdited && p.prompt !== p.promptBase) {
    openDialog({ title: 'Replace your edits?', message: 'Regenerating rebuilds the prompt from your project data and discards the changes you made in the text box.', okText: 'Regenerate', danger: true }).then(function (yes) { if (yes) doIt(); });
  } else doIt();
}
async function copyPrompt() {
  const ta = $('#prompt-text'), text = ta.value;
  if (!text.trim()) { setStatus('There is nothing to copy. The prompt is empty.', 'error'); return; }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      setStatus('Copied the full prompt (' + text.length + ' characters).', 'ok'); toast('Prompt copied.', 'ok', 2200); return;
    }
  } catch (e) { /* fall through to the manual method */ }
  ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  if (ok) { setStatus('Copied the full prompt (' + text.length + ' characters).', 'ok'); toast('Prompt copied.', 'ok', 2200); }
  else setStatus('Automatic copy is not available here. The whole prompt is selected: press Ctrl+C (Cmd+C on Mac) to copy it.', 'error');
}

/* ---------- custom styles: validate, save, edit, import, export ---------- */
const STYLE_TEXT_FIELDS = [['typography', 'Typography'], ['layout', 'Layout'], ['components', 'Components and borders'],
  ['image', 'Image treatment'], ['cta', 'CTA treatment'], ['avoid', 'Elements to avoid']];
const PALETTE_ROLES = [['bg', 'Background'], ['surface', 'Surface'], ['ink', 'Text'], ['muted', 'Muted text'], ['line', 'Lines'],
  ['accent', 'Accent'], ['accent2', 'Accent 2']];
const FIT_LISTS = { personality: PERSONALITY, emotion: EMOTION, price: PRICE, audience: AUDIENCE };
const FIT_LABELS = { personality: 'Brand personality', emotion: 'Emotional impression', price: 'Price positioning', audience: 'Audience type' };
const MAX_CUSTOM_STYLES = 40;
let editingStyleId = null;
let editorTimer = null;

function cleanText(s, max) { return String(s === null || s === undefined ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function normHex(s) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(s || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
  return '#' + h.toUpperCase();
}
function contrastRatio(a, b) {
  const la = luminance(a.toLowerCase()), lb = luminance(b.toLowerCase());
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); }

/* Text used when a custom style leaves guidance fields empty. */
function defaultTexts(s) {
  const r = s.recipe, lab = function (k, v) { const f = RECIPE_OPTS[k].filter(function (o) { return o[0] === v; })[0]; return f ? f[1].toLowerCase() : v; };
  return {
    typography: 'Headings in ' + FONT_LABELS[s.fonts.display].toLowerCase() + ' (' + lab('weight', r.weight) + ', ' + lab('caps', r.caps) + '); body text in ' + FONT_LABELS[s.fonts.body].toLowerCase() + '.',
    layout: 'Hero: ' + lab('hero', r.hero) + '. Lists: ' + lab('list', r.list) + '. Section backgrounds: ' + lab('sections', r.sections) + '. Spacing: ' + lab('density', r.density) + '.',
    components: 'Corners: ' + lab('radius', r.radius) + '. Borders: ' + lab('border', r.border) + '. Shadows: ' + lab('shadow', r.shadow) + '.',
    image: 'Use imagery that fits this palette and keep one consistent treatment across the page.',
    cta: lab('button', r.button).replace(/^./, function (c) { return c.toUpperCase(); }) + ' buttons in the accent color, clearly the strongest element in view.',
    avoid: 'Colors, effects and decorations that are not part of this palette and these choices.'
  };
}

/* The single gatekeeper for custom and imported styles. Returns { style } or { errors }. */
function sanitizeStyle(obj, keepId) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { errors: ['The data must be one JSON object.'] };
  const errors = [];
  const name = cleanText(String(obj.name === undefined || obj.name === null ? '' : obj.name).replace(/[<>]/g, ''), 60);
  if (!name) errors.push('Give the style a name.');
  const pal = {}, src = obj.palette && typeof obj.palette === 'object' ? obj.palette : {};
  PALETTE_ROLES.forEach(function (r) {
    const h = normHex(src[r[0]]);
    if (!h) errors.push('Color "' + r[1] + '" must be a hex code such as #1F6F78.'); else pal[r[0]] = h;
  });
  if (pal.bg && pal.ink && contrastRatio(pal.bg, pal.ink) < 4.5) errors.push('Text and background colors need a contrast ratio of at least 4.5:1 so the page stays readable.');
  const fonts = { display: 'sans', body: 'sans' }, fs = obj.fonts && typeof obj.fonts === 'object' ? obj.fonts : {};
  ['display', 'body'].forEach(function (k) {
    if (fs[k] === undefined) return;
    if (Object.prototype.hasOwnProperty.call(FONT_STACKS, fs[k])) fonts[k] = fs[k];
    else errors.push('Font "' + k + '" must be one of: ' + Object.keys(FONT_STACKS).join(', ') + '.');
  });
  const rec = Object.assign({}, RECIPE_DEFAULT), rs = obj.recipe && typeof obj.recipe === 'object' ? obj.recipe : {};
  Object.keys(RECIPE_OPTS).forEach(function (k) {
    if (rs[k] === undefined) return;
    if (RECIPE_OPTS[k].some(function (o) { return o[0] === rs[k]; })) rec[k] = rs[k];
    else errors.push('Layout option "' + k + '" must be one of: ' + RECIPE_OPTS[k].map(function (o) { return o[0]; }).join(', ') + '.');
  });
  const catIds = CATEGORIES.map(function (c) { return c[0]; });
  const cats = (Array.isArray(obj.categories) ? obj.categories : []).filter(function (c) { return catIds.indexOf(c) !== -1; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
  const fit = {}, fsrc = obj.fit && typeof obj.fit === 'object' ? obj.fit : {};
  Object.keys(FIT_LISTS).forEach(function (k) {
    const ok = FIT_LISTS[k].map(function (x) { return x[0]; });
    fit[k] = (Array.isArray(fsrc[k]) ? fsrc[k] : []).filter(function (x) { return ok.indexOf(x) !== -1; });
  });
  if (errors.length) return { errors: errors };
  const style = {
    id: keepId && /^c-[a-z0-9-]{1,60}$/.test(keepId) ? keepId : 'c-' + (slugify(name) || 'style') + '-' + Math.random().toString(36).slice(2, 7),
    custom: true, name: name, description: cleanText(obj.description, 240) || 'Custom style.',
    categories: cats, palette: pal, fonts: fonts, fit: fit, recipe: rec
  };
  STYLE_TEXT_FIELDS.forEach(function (f) { style[f[0]] = cleanText(obj[f[0]], 400); });
  const d = defaultTexts(style);
  STYLE_TEXT_FIELDS.forEach(function (f) { if (!style[f[0]]) style[f[0]] = d[f[0]]; });
  return { style: style, errors: [] };
}

function styleToObj(s) {
  const o = { format: 'lpps-style', version: 1, name: s.name, description: s.description, categories: s.categories.slice(),
    palette: Object.assign({}, s.palette), fonts: Object.assign({}, s.fonts), recipe: Object.assign({}, s.recipe),
    fit: { personality: s.fit.personality.slice(), emotion: s.fit.emotion.slice(), price: s.fit.price.slice(), audience: s.fit.audience.slice() } };
  STYLE_TEXT_FIELDS.forEach(function (f) { o[f[0]] = s[f[0]]; });
  return o;
}

function loadCustomStyles() {
  const raw = storageGet(KEYS.styles);
  customStyles = [];
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('bad');
      arr.slice(0, MAX_CUSTOM_STYLES).forEach(function (o) { const r = sanitizeStyle(o, o && o.id); if (r.style) customStyles.push(r.style); });
    } catch (e) { storageSet('lpps.styles.v1.damaged', raw); toast('Your saved custom styles could not be read, so the list was reset.', 'error', 7000); }
  }
  rebuildStyles();
}
function saveCustomStyles() {
  if (!storageSet(KEYS.styles, JSON.stringify(customStyles))) { toast('Could not save your styles: browser storage is unavailable or full.', 'error', 7000); return false; }
  return true;
}

/* ----- the prompt that asks Claude to produce a style file ----- */
function styleMakerPrompt() {
  const pick = function (list) { return list.map(function (x) { return x[0]; }).join(' | '); };
  const example = {
    format: 'lpps-style', version: 1, name: 'Style name', description: 'One sentence describing the mood.',
    categories: ['digital', 'course'],
    palette: { bg: '#FBF7F0', surface: '#F0E8DA', ink: '#2B2622', muted: '#6B6258', line: '#D9CFBF', accent: '#A4442A', accent2: '#F0DCC8' },
    fonts: { display: 'serif', body: 'sans' },
    recipe: { hero: 'split', radius: 'md', border: 'thin', shadow: 'none', weight: 'bold', caps: 'normal', list: 'rows', button: 'solid', sections: 'plain', density: 'normal' },
    fit: { personality: ['warm'], emotion: ['trust'], price: ['mid'], audience: ['beginners'] },
    typography: 'Short description of the type style.', layout: 'Short description of the composition.',
    components: 'Corners, borders, shadows.', image: 'How photos or illustrations are treated.',
    cta: 'How the main button looks.', avoid: 'What would break this style.'
  };
  const lines = [
    'You are helping me create a custom visual style for a landing page prompt tool.',
    'I will attach a screenshot or describe a design I like. Study its visual language: palette, typography, layout, shapes, borders, shadows, imagery and buttons.',
    'Reply with ONLY one JSON object inside a single code block. No commentary before or after it.',
    '',
    'Rules:',
    '- Describe the design language only. Do not include brand names, logos or copied text.',
    '- Every palette value is a hex code (#RRGGBB). The "ink" color must have at least 4.5:1 contrast on "bg".',
    '- Use only the allowed values below. Text fields are plain text, 300 characters or fewer.',
    '',
    'Allowed values:',
    '- fonts.display and fonts.body: ' + Object.keys(FONT_STACKS).join(' | ')
  ];
  Object.keys(RECIPE_OPTS).forEach(function (k) { lines.push('- recipe.' + k + ': ' + pick(RECIPE_OPTS[k])); });
  lines.push('- categories (array, any of): ' + pick(CATEGORIES));
  Object.keys(FIT_LISTS).forEach(function (k) { lines.push('- fit.' + k + ' (array, any of): ' + pick(FIT_LISTS[k])); });
  lines.push('', 'JSON format:', JSON.stringify(example, null, 2), '', 'My reference: [attach a screenshot here, or describe the look in a few sentences]');
  return lines.join('\n');
}

/* ----- gallery panes ----- */
function showGalleryPane(name) {
  ['list', 'detail', 'edit', 'import'].forEach(function (n) { $('#gallery-' + n).hidden = n !== name; });
  window.scrollTo(0, 0);
}
function refreshStyleSelects() {
  const base = $('#f-design-baseStyleId'), keep = base.value; base.textContent = '';
  base.append(el('option', { value: 'auto' }, 'Automatic (best rule-based match for my brief)'));
  STYLES.forEach(function (s) { base.append(el('option', { value: s.id }, s.name)); });
  base.value = STYLE_BY_ID[keep] ? keep : 'auto';
  const gc = $('#gallery-category'), cur = gc.value; gc.textContent = ''; gc.append(el('option', { value: '' }, 'All categories'));
  CATEGORIES.forEach(function (c) { if (STYLES.some(function (s) { return s.categories.indexOf(c[0]) !== -1; })) gc.append(el('option', { value: c[0] }, c[1])); });
  gc.value = cur;
}

/* ----- editor ----- */
function blankStyleObj() {
  return { name: '', description: '', categories: [], palette: { bg: '#FBF7F0', surface: '#F0E8DA', ink: '#2B2622', muted: '#6B6258', line: '#D9CFBF', accent: '#A4442A', accent2: '#F0DCC8' },
    fonts: { display: 'serif', body: 'sans' }, recipe: Object.assign({}, RECIPE_DEFAULT), fit: { personality: [], emotion: [], price: [], audience: [] },
    typography: '', layout: '', components: '', image: '', cta: '', avoid: '' };
}

function fieldset(legend, hint) { return el('fieldset', { class: 'se-set' }, el('legend', null, legend), hint ? el('p', { class: 'hint' }, hint) : null); }
function labeled(id, text, control) { return el('div', { class: 'field' }, el('label', { for: id }, text), control); }
function selectOf(id, pairs, value, emptyLabel) {
  const s = el('select', { id: id });
  if (emptyLabel) s.append(el('option', { value: '' }, emptyLabel));
  pairs.forEach(function (p) { s.append(el('option', { value: p[0] }, p[1])); });
  s.value = value || '';
  return s;
}

function buildStyleForm(v) {
  const f = $('#se-form'); f.textContent = '';
  const basics = fieldset('Basics');
  basics.append(labeled('se-name', 'Style name (required)', el('input', { id: 'se-name', type: 'text', maxlength: '60', value: v.name, autocomplete: 'off' })));
  basics.append(labeled('se-description', 'Short description', el('textarea', { id: 'se-description', rows: '2', maxlength: '240' }, v.description)));
  f.append(basics);

  const colors = fieldset('Colors', 'Pick with the color square or type a hex code. Text on background needs 4.5:1 contrast.');
  const grid = el('div', { class: 'color-grid' });
  PALETTE_ROLES.forEach(function (r) {
    const hex = v.palette[r[0]];
    const picker = el('input', { type: 'color', id: 'se-c-' + r[0], value: normHex(hex) ? normHex(hex).toLowerCase() : '#000000', 'aria-label': r[1] + ' color picker' });
    const text = el('input', { type: 'text', id: 'se-h-' + r[0], value: hex, maxlength: '7', autocomplete: 'off', spellcheck: 'false', 'aria-label': r[1] + ' hex code' });
    picker.addEventListener('input', function () { text.value = picker.value.toUpperCase(); scheduleEditorPreview(); });
    text.addEventListener('input', function () { const h = normHex(text.value); if (h) picker.value = h.toLowerCase(); scheduleEditorPreview(); });
    grid.append(el('div', { class: 'color-row' }, el('span', { class: 'color-name' }, r[1]), picker, text));
  });
  colors.append(grid); f.append(colors);

  const fonts = fieldset('Fonts', 'Only safe system fonts, so the page works everywhere.');
  fonts.append(labeled('se-font-display', 'Headings', selectOf('se-font-display', Object.keys(FONT_LABELS).map(function (k) { return [k, FONT_LABELS[k]]; }), v.fonts.display)));
  fonts.append(labeled('se-font-body', 'Body text', selectOf('se-font-body', Object.keys(FONT_LABELS).map(function (k) { return [k, FONT_LABELS[k]]; }), v.fonts.body)));
  f.append(fonts);

  const lay = fieldset('Look and layout');
  Object.keys(RECIPE_OPTS).forEach(function (k) { lay.append(labeled('se-r-' + k, RECIPE_LABELS[k], selectOf('se-r-' + k, RECIPE_OPTS[k], v.recipe[k]))); });
  f.append(lay);

  const cats = fieldset('Suitable for', 'Used by the style gallery filter.');
  const cl = el('div', { class: 'check-grid' });
  CATEGORIES.forEach(function (c) {
    const cb = el('input', { type: 'checkbox', id: 'se-cat-' + c[0], value: c[0] }); cb.checked = v.categories.indexOf(c[0]) !== -1;
    cl.append(el('label', { class: 'check', for: 'se-cat-' + c[0] }, cb, c[1]));
  });
  cats.append(cl); f.append(cats);

  const fit = fieldset('Recommendation hints (optional)', 'Lets "Recommend for me" suggest this style.');
  Object.keys(FIT_LISTS).forEach(function (k) { fit.append(labeled('se-fit-' + k, FIT_LABELS[k], selectOf('se-fit-' + k, FIT_LISTS[k], v.fit[k][0] || '', 'Not set'))); });
  f.append(fit);

  const txt = fieldset('Guidance for the prompt (optional)', 'Plain text. Leave empty and the app writes it from your choices above.');
  STYLE_TEXT_FIELDS.forEach(function (t) { txt.append(labeled('se-t-' + t[0], t[1], el('textarea', { id: 'se-t-' + t[0], rows: '2', maxlength: '400' }, v[t[0]]))); });
  f.append(txt);

  f.append(el('div', { id: 'se-error', class: 'banner banner-error', role: 'alert', tabindex: '-1', hidden: true }));
  f.append(el('div', { class: 'btn-row' },
    el('button', { type: 'submit', class: 'btn btn-primary' }, 'Save style'),
    el('button', { type: 'button', class: 'btn btn-quiet', onclick: leaveEditor }, 'Cancel')));
}

function readEditorObj() {
  const g = function (id) { const n = $('#' + id); return n ? n.value : ''; };
  const o = { name: g('se-name'), description: g('se-description'), palette: {}, fonts: { display: g('se-font-display'), body: g('se-font-body') }, recipe: {}, categories: [], fit: {} };
  PALETTE_ROLES.forEach(function (r) { o.palette[r[0]] = g('se-h-' + r[0]); });
  Object.keys(RECIPE_OPTS).forEach(function (k) { o.recipe[k] = g('se-r-' + k); });
  CATEGORIES.forEach(function (c) { if ($('#se-cat-' + c[0]).checked) o.categories.push(c[0]); });
  Object.keys(FIT_LISTS).forEach(function (k) { const v = g('se-fit-' + k); o.fit[k] = v ? [v] : []; });
  STYLE_TEXT_FIELDS.forEach(function (t) { o[t[0]] = g('se-t-' + t[0]); });
  return o;
}
function scheduleEditorPreview() { clearTimeout(editorTimer); editorTimer = setTimeout(updateEditorPreview, 120); }
function updateEditorPreview() {
  const o = readEditorObj(); if (!o.name.trim()) o.name = 'Preview';
  const r = sanitizeStyle(o, 'c-preview');
  const box = $('#se-preview');
  if (!r.style) return; // keep the last good preview while a value is half-typed
  box.textContent = ''; box.append(renderLanding(sampleProject(), { style: r.style, only: ['hero', 'benefits', 'how', 'offer', 'final'] }));
}
function openStyleEditor(style) {
  editingStyleId = style ? style.id : null;
  showGalleryPane('edit');
  $('#se-title').textContent = style ? 'Edit your style' : 'Create your own style';
  buildStyleForm(style ? styleToObj(style) : blankStyleObj());
  updateEditorPreview();
  $('#se-title').focus({ preventScroll: true });
}
function leaveEditor() {
  if (editingStyleId && STYLE_BY_ID[editingStyleId]) showGalleryDetail(editingStyleId); else { showGalleryPane('list'); renderGallery(); }
}
function showFormErrors(box, errors) {
  box.textContent = '';
  box.append(el('p', null, el('strong', null, errors.length === 1 ? 'One thing to fix:' : errors.length + ' things to fix:')), el('ul', null, errors.map(function (e) { return el('li', null, e); })));
  box.hidden = false; box.focus();
}
function saveEditorStyle(e) {
  e.preventDefault();
  const box = $('#se-error'); box.hidden = true;
  const r = sanitizeStyle(readEditorObj(), editingStyleId);
  if (!r.style) { showFormErrors(box, r.errors); return; }
  addOrReplaceCustomStyle(r.style, editingStyleId ? 'Style updated.' : 'Style saved. You can now pick it in Design.');
}
function addOrReplaceCustomStyle(style, message) {
  const idx = customStyles.map(function (s) { return s.id; }).indexOf(style.id);
  if (idx === -1 && customStyles.length >= MAX_CUSTOM_STYLES) { toast('You can keep up to ' + MAX_CUSTOM_STYLES + ' custom styles. Delete one first.', 'error'); return false; }
  if (idx === -1) customStyles.push(style); else customStyles[idx] = style;
  rebuildStyles(); refreshStyleSelects();
  const saved = saveCustomStyles();
  renderGallery();
  showGalleryDetail(style.id);
  toast(saved ? message : 'Style added for this session, but it could not be saved in this browser.', saved ? 'ok' : 'error', 5000);
  return true;
}

/* ----- import / export ----- */
function openImport() {
  showGalleryPane('import');
  $('#maker-text').value = styleMakerPrompt(); $('#imp-text').value = ''; $('#imp-file').value = '';
  $('#imp-error').hidden = true; $('#maker-status').textContent = '';
  $('#imp-title').focus({ preventScroll: true });
}
async function copyText(text, ta) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* fall back */ }
  if (ta) { ta.focus(); ta.select(); try { return document.execCommand('copy'); } catch (e) { return false; } }
  return false;
}
function doImport() {
  const box = $('#imp-error'); box.hidden = true;
  let text = $('#imp-text').value.trim();
  if (!text) { showFormErrors(box, ['Paste the JSON or choose a file first.']); return; }
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text); if (fence) text = fence[1].trim();
  let obj;
  try { obj = JSON.parse(text); } catch (e) { showFormErrors(box, ['This is not valid JSON, so nothing was imported. Make sure you copied the whole code block from Claude.']); return; }
  if (obj && obj.format !== undefined && obj.format !== 'lpps-style') { showFormErrors(box, ['This file is not a style file from this app (format "' + cleanText(obj.format, 30) + '").']); return; }
  const r = sanitizeStyle(obj, null);
  if (!r.style) { showFormErrors(box, r.errors); return; }
  addOrReplaceCustomStyle(r.style, 'Imported "' + r.style.name + '".');
}
function exportStyle(s) {
  try {
    const blob = new Blob([JSON.stringify(styleToObj(s), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (slugify(s.name) || 'style') + '.lpps-style.json';
    document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    toast('Style file downloaded.', 'ok', 2500);
  } catch (e) { toast('The file could not be created in this browser.', 'error'); }
}
function deleteCustomStyle(id) {
  const s = STYLE_BY_ID[id]; if (!s || !s.custom) return;
  openDialog({ title: 'Delete this style?', message: '"' + s.name + '" will be removed. Projects that use it will need a new style choice.', okText: 'Delete', danger: true }).then(function (yes) {
    if (!yes) return;
    customStyles = customStyles.filter(function (x) { return x.id !== id; });
    rebuildStyles(); refreshStyleSelects(); saveCustomStyles();
    state.projects.forEach(function (p) {
      if (p.design.styleId === id) p.design.styleId = '';
      if (p.design.baseStyleId === id) p.design.baseStyleId = 'auto';
      p.design.recommend.results = p.design.recommend.results.filter(function (x) { return x !== id; });
    });
    persist();
    showGalleryPane('list'); renderGallery(); toast('Style deleted.', 'ok');
  });
}

/* =====================================================================
   8. INIT
   ===================================================================== */

function bindEvents() {
  // Navigation
  $$('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { showView(b.dataset.nav); }); });
  $('#btn-new-dashboard').addEventListener('click', newProject);
  $('#btn-new-projects').addEventListener('click', newProject);

  // Gallery
  $('#gallery-search').addEventListener('input', renderGallery);
  $('#gallery-category').addEventListener('change', renderGallery);
  $('#gallery-back').addEventListener('click', function () { showGalleryList(); renderGallery(); window.scrollTo(0, 0); });
  $('#detail-apply').addEventListener('click', function () { applyStyleToProject(state.galleryDetailId); });

  // Custom styles
  $('#btn-style-new').addEventListener('click', function () { openStyleEditor(null); });
  $('#btn-style-import').addEventListener('click', openImport);
  $('#se-back').addEventListener('click', leaveEditor);
  $('#imp-back').addEventListener('click', function () { showGalleryPane('list'); renderGallery(); });
  $('#se-form').addEventListener('submit', saveEditorStyle);
  $('#se-form').addEventListener('input', scheduleEditorPreview);
  $('#se-form').addEventListener('change', scheduleEditorPreview);
  $('#btn-maker-copy').addEventListener('click', function () {
    copyText($('#maker-text').value, $('#maker-text')).then(function (ok) {
      const n = $('#maker-status'); n.className = 'status ' + (ok ? 'status-ok' : 'status-error');
      n.textContent = ok ? 'Prompt copied. Paste it into Claude and attach your reference.' : 'Automatic copy is not available here. The text is selected: press Ctrl+C (Cmd+C on Mac).';
    });
  });
  $('#imp-file').addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 200 * 1024) { showFormErrors($('#imp-error'), ['That file is larger than 200 KB. A style file should be much smaller.']); return; }
    const rd = new FileReader();
    rd.onload = function () { $('#imp-text').value = String(rd.result); $('#imp-error').hidden = true; };
    rd.onerror = function () { showFormErrors($('#imp-error'), ['The file could not be read.']); };
    rd.readAsText(f);
  });
  $('#btn-imp-go').addEventListener('click', doImport);
  $('#detail-edit').addEventListener('click', function () { openStyleEditor(getStyle(state.galleryDetailId)); });
  $('#detail-export').addEventListener('click', function () { exportStyle(getStyle(state.galleryDetailId)); });
  $('#detail-delete').addEventListener('click', function () { deleteCustomStyle(state.galleryDetailId); });
  $('#picker-search').addEventListener('input', renderStylePicker);
  $('#picker-new').addEventListener('click', function () { showView('gallery'); });

  // Settings
  $('#set-platform').addEventListener('change', function (e) { state.settings.platform = e.target.value; if (saveSettings()) toast('Default platform saved.', 'ok', 2000); });
  $('#set-language').addEventListener('change', function (e) { state.settings.language = e.target.value; if (saveSettings()) toast('Default language saved.', 'ok', 2000); });
  $('#btn-clear').addEventListener('click', function () {
    openDialog({ title: 'Clear all local data?', message: 'This removes every saved project and your settings from this browser. It cannot be undone.', okText: 'Clear everything', danger: true }).then(function (yes) {
      if (!yes) return;
      storageRemove(KEYS.projects); storageRemove(KEYS.settings); storageRemove(KEYS.styles); storageRemove('lpps.projects.v1.damaged'); storageRemove('lpps.styles.v1.damaged');
      customStyles = []; rebuildStyles(); refreshStyleSelects();
      state.projects = []; state.current = null; state.dirty = false; state.settings = { platform: 'lynk', language: 'id' };
      renderSettings(); toast('All local project data was cleared.', 'ok');
    });
  });

  // Wizard fields
  $$('[data-bind]').forEach(function (inp) { inp.addEventListener('input', onBindInput); inp.addEventListener('change', onBindInput); });
  $$('input[name="designMode"]').forEach(function (r) {
    r.addEventListener('change', function () { if (!r.checked || !state.current) return; state.current.design.mode = r.value; $('#e-design-mode').hidden = true; clearErrors(); scheduleSave(); renderStep2(); });
  });
  $('#btn-recommend').addEventListener('click', runRecommend);
  $('#ref-file').addEventListener('change', function (e) { handleRefFile(e.target.files && e.target.files[0]); });
  $('#ref-remove').addEventListener('click', function () {
    const d = state.current.design; d.referenceImage = ''; d.referenceImageName = ''; $('#ref-file').value = ''; renderRefImage(); saveNow(); toast('Reference image removed.', 'ok', 2000);
  });
  $('#btn-restore-sections').addEventListener('click', function () {
    const p = state.current; p.sections = defaultSections(p.brief.goal || 'other'); p.sectionsCustomized = false; scheduleSave(); renderSections(); toast('Recommended structure restored.', 'ok', 2200);
  });

  // Footer + step links
  $('#btn-next').addEventListener('click', goNext);
  $('#btn-back').addEventListener('click', goBack);
  $$('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { showStep(Number(b.dataset.goto)); }); });

  // Step 3 extras
  $('#tm-add').addEventListener('click', function () { addRepeaterItem('tm'); });
  $('#gal-add').addEventListener('click', function () { addRepeaterItem('gal'); });
  $('#stat-add').addEventListener('click', function () { addRepeaterItem('stat'); });
  $('#btn-pv-popup').addEventListener('click', function () {
    const p = state.current, L = L10N[p.brief.language] || L10N.en, dlg = $('#dlg-popup'), box = $('#popup-mock');
    box.textContent = ''; box.append(popupMock(p, L));
    const res = resolvePalette(p, getStyle(resolveStyleId(p))).pal;
    dlg.style.setProperty('--pm-bg', res.bg); dlg.style.setProperty('--pm-ink', res.ink); dlg.style.setProperty('--pm-accent', res.accent); dlg.style.setProperty('--pm-on', readable(res.accent));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  });
  setupLogo();

  // Preview
  $('#btn-gen-preview').addEventListener('click', generatePreview);
  $$('.seg-btn').forEach(function (b) { b.addEventListener('click', function () { state.viewport = b.dataset.vp; renderPreviewPanel(); }); });

  // Prompt
  $('#prompt-text').addEventListener('input', function (e) {
    const p = state.current; p.prompt = e.target.value; p.promptEdited = p.prompt !== p.promptBase; updatePromptStats(); scheduleSave();
  });
  $('#btn-copy').addEventListener('click', copyPrompt);
  $('#btn-regen').addEventListener('click', regeneratePrompt);
  $('#btn-edit-prompt').addEventListener('click', function () { const ta = $('#prompt-text'); ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0; setStatus('You can edit the prompt directly in the text box. Changes are saved automatically.', 'info'); });
  $('#btn-new-from-6').addEventListener('click', newProject);

  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);
}

function populateSelects() {
  fillSelect($('#f-brief-category'), CATEGORIES, 'Select a category (optional)');
  fillSelect($('#f-brief-goal'), GOALS, 'Select a goal');
  fillSelect($('#f-design-recommend-personality'), PERSONALITY, 'Select...');
  fillSelect($('#f-design-recommend-emotion'), EMOTION, 'Select...');
  fillSelect($('#f-design-recommend-price'), PRICE, 'Select...');
  fillSelect($('#f-design-recommend-audience'), AUDIENCE, 'Select...');
  refreshStyleSelects();
}

function init() {
  detectStorage();
  loadSettings();
  loadCustomStyles();
  loadProjects();
  populateSelects();
  bindEvents();
  showView('dashboard', false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
