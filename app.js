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
const STYLES = [
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
const STYLE_BY_ID = {};
STYLES.forEach(function (s) { STYLE_BY_ID[s.id] = s; });
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

/* Text used inside the mockup (not the app UI). */
const L10N = {
  en: {
    sec: { problem: 'The problem', solution: 'The solution', benefits: 'Benefits', features: 'Features', how: 'How it works',
           included: 'What\'s included', proof: 'Social proof', offer: 'Offer and pricing', bonus: 'Bonus', faq: 'Questions' },
    cta: { digital: 'Get the product', service: 'Book a consultation', leads: 'Join the list', brand: 'Get in touch',
           physical: 'Shop now', course: 'Join the course', other: 'Learn more' },
    forAudience: 'For ', yourProduct: 'Your product', placeholder: 'Content for this part will be written from your brief.',
    noPrice: 'No price entered yet.', noProof: 'No real proof provided. The prompt will tell Claude to skip this or use truthful trust elements.',
    step: 'Step', provided: 'Provided by you', imageArea: 'Product image area'
  },
  id: {
    sec: { problem: 'Masalahnya', solution: 'Solusinya', benefits: 'Manfaat', features: 'Fitur', how: 'Cara kerja',
           included: 'Isi paket', proof: 'Bukti sosial', offer: 'Penawaran', bonus: 'Bonus', faq: 'Pertanyaan umum' },
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

/* =====================================================================
   3. PROJECT MODEL + STORAGE
   ===================================================================== */

const KEYS = { projects: 'lpps.projects.v1', settings: 'lpps.settings.v1' };
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
      productImageUrl: '', socialProof: '', tone: 'auto', notes: '', formulas: []
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
  SECTION_DEFS.forEach(function (d) { if (!seen[d.id]) fixed.push({ id: d.id, enabled: false }); });
  p.sections = fixed;
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
      body));
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
    const t = ctx.p.content.socialProof.trim();
    const body = t
      ? el('div', { class: 'pv-copy pv-quote' }, t.split(/\r?\n/).filter(Boolean).map(function (x) { return el('p', null, x); }), el('p', { class: 'pv-note' }, ctx.L.provided))
      : el('div', { class: 'pv-copy' }, skel(['88%', '64%']), el('p', { class: 'pv-note' }, ctx.L.noProof));
    return secShell('proof', ctx, ctx.L.sec.proof, body);
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
    const rows = [['72%'], ['58%'], ['66%']].map(function (w) { return el('div', { class: 'pv-faq-row' }, skel(w), el('i', { class: 'pv-plus' })); });
    return secShell('faq', ctx, ctx.L.sec.faq, el('div', null, el('div', { class: 'pv-faq' }, rows), el('p', { class: 'pv-note' }, ctx.L.placeholder)));
  },
  final: function (ctx) {
    const p = ctx.p;
    return el('section', { class: 'pv-sec pv-final' },
      el('div', { class: 'pv-inner' },
        el('h2', { class: 'pv-h2' }, p.brief.productName.trim() || ctx.L.yourProduct),
        el('div', { class: 'pv-cta-row' }, ctaButton(p, ctx.L))));
  }
};

/* Builds the full mockup element. opts: { style, thumb, only } */
function renderLanding(p, opts) {
  opts = opts || {};
  const style = opts.style || getStyle(resolveStyleId(p));
  const L = L10N[p.brief.language] || L10N.en;
  const wrap = el('div', { class: 'pv-wrap' });
  const pv = el('div', { class: 'pv s-' + style.id + (opts.thumb ? ' is-thumb' : '') });
  const pal = Object.assign({}, style.palette);
  const hex = parseHex(p.content.colors);
  if (hex[0]) pal.accent = hex[0];
  if (hex[1]) pal.accent2 = hex[1];
  const vars = {
    '--bg': pal.bg, '--surface': pal.surface, '--ink': pal.ink, '--muted': pal.muted, '--line': pal.line,
    '--accent': pal.accent, '--accent2': pal.accent2, '--on-accent': readable(pal.accent), '--on-accent2': readable(pal.accent2),
    '--display': style.fonts.display, '--body': style.fonts.body
  };
  Object.keys(vars).forEach(function (k) { pv.style.setProperty(k, vars[k]); });

  if (!opts.thumb) {
    pv.append(el('header', { class: 'pv-top' }, el('span', { class: 'pv-brand' }, p.brief.productName.trim() || L.yourProduct), el('span', { class: 'pv-rule-dot' })));
  }
  const ids = opts.only || p.sections.filter(function (s) { return s.enabled; }).map(function (s) { return s.id; });
  let num = 0;
  ids.forEach(function (id) {
    if (!SECTION_RENDER[id]) return;
    if (id !== 'hero' && id !== 'final') num++;
    pv.append(SECTION_RENDER[id]({ p: p, L: L, style: style, num: num || 1 }));
  });
  if (!ids.length) pv.append(el('section', { class: 'pv-sec' }, el('p', { class: 'pv-note' }, 'No sections are switched on. Go to the Page Planner to enable some.')));
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
  const hexes = parseHex(c.colors);
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
  out.push('- Suggested palette: background ' + style.palette.bg + ', surface ' + style.palette.surface + ', text ' + style.palette.ink + ', muted text ' + style.palette.muted +
    ', lines ' + style.palette.line + ', main accent ' + style.palette.accent + ', secondary accent ' + style.palette.accent2 + '.');
  if (hexes.length) out.push('- Brand colors I supplied: ' + hexes.join(', ') + '. These take priority for accent roles. Keep body text contrast at WCAG AA (4.5:1) or better.');
  else if (c.colors.trim()) out.push('- Brand colors I described: ' + c.colors.trim() + '. Translate them into suitable hex values and keep text contrast at WCAG AA or better.');
  else out.push('- Brand colors: none supplied. Use the suggested palette.');
  out.push('- Typography: ' + style.typography);
  out.push('- Font stack: ' + style.fonts.display + ' for headings; ' + style.fonts.body + ' for body. Use these system font stacks only, with no web-font downloads.');
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
  if (c.socialProof.trim()) out.push('- Real social proof to use exactly as written (only light formatting allowed):\n' + c.socialProof.trim().split(/\r?\n/).map(function (x) { return '  > ' + x; }).join('\n'));
  else out.push('- Social proof: none supplied. Do not write testimonials, reviews, customer counts or ratings. Omit the section or use truthful alternatives such as the product contents or the process.');
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
    out.push('- Deliver complete HTML and CSS' + (b.outputFormat === 'single' ? ' in ONE single HTML file with the CSS inside a <style> tag.' : ' as two files: index.html and styles.css, linked with <link rel="stylesheet" href="styles.css">.'));
    out.push('- Semantic HTML: header, main, section with headings in logical order, footer. One h1 only.');
    out.push('- Responsive, mobile-first layout with min-width media queries. No horizontal scrolling at any width.');
    out.push('- Minimal dependencies: no frameworks, no CSS libraries, no build step. No JavaScript unless strictly needed (use <details> for the FAQ).');
    out.push('- Use CSS custom properties for colors and spacing so I can edit them easily. Include visible focus styles and respect prefers-reduced-motion.');
    out.push('- ' + (b.outputFormat === 'single' ? 'A single file is preferred so I can save and open it immediately.' : 'Keep the file structure to exactly those two files.'));
  }

  /* 9 */
  H('9. Asset and image requirements');
  if (c.productImageUrl.trim()) out.push('- Product image: use this URL in the hero or main visual with descriptive alt text: ' + c.productImageUrl.trim());
  else out.push('- Product image: none supplied. Use a typography-led composition or simple CSS/inline shapes. Do not insert unrelated stock photos or hotlink random images.');
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
  out.push(lynk ? '- [ ] 100% inline CSS, no <style>, no <script>, no keyframes, width limit ' + maxW + ' is applied.' :
    '- [ ] HTML is semantic, files match the requested structure, and there is no unnecessary JavaScript.');

  /* 12 */
  H('12. Required output format');
  out.push('1. One short line naming the design direction you used.');
  if (lynk) out.push('2. The complete HTML in a single code block (language: html). Nothing outside the code block is part of the page.');
  else if (b.outputFormat === 'single') out.push('2. The complete single-file HTML in one code block (language: html).');
  else out.push('2. Two code blocks, each labeled with its filename: index.html and styles.css.');
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
    out.push('1. Create a new folder and save the two files in it with the exact names index.html and styles.css.');
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
      el('span', { class: 'style-card-name' }, s.name, opts.selected ? el('span', { class: 'chip' }, 'Selected') : null),
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
function showGalleryList() { state.galleryDetailId = null; $('#gallery-list').hidden = false; $('#gallery-detail').hidden = true; }
function showGalleryDetail(id) {
  const s = getStyle(id); state.galleryDetailId = id;
  $('#gallery-list').hidden = true; $('#gallery-detail').hidden = false;
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
    if (d.mode === 'style' && !d.styleId) errs.push({ path: 'design.styleId', msg: 'Select a style from the gallery.' });
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
  if (n === 3) renderFormulas();
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
  STYLES.forEach(function (s) {
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
  if (parseHex(c.colors).length) assets.push('Brand colors: ' + parseHex(c.colors).join(', '));
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
  if (on('proof') && !c.socialProof.trim()) missing.push('Real social proof (section is on)');
  if (!c.productImageUrl.trim()) missing.push('Product image URL');
  if (!c.colors.trim()) missing.push('Brand colors');
  const ml = $('#missing-list'); ml.textContent = '';
  (missing.length ? missing : ['Nothing important is missing.']).forEach(function (t) { ml.append(el('li', null, t)); });

  $('#preview-block').hidden = !state.previewShown;
  if (state.previewShown) renderPreviewPanel();
}
function renderPreviewPanel() {
  const p = state.current, frame = $('#preview-frame');
  frame.textContent = ''; frame.dataset.vp = state.viewport;
  frame.append(renderLanding(p));
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

  // Settings
  $('#set-platform').addEventListener('change', function (e) { state.settings.platform = e.target.value; if (saveSettings()) toast('Default platform saved.', 'ok', 2000); });
  $('#set-language').addEventListener('change', function (e) { state.settings.language = e.target.value; if (saveSettings()) toast('Default language saved.', 'ok', 2000); });
  $('#btn-clear').addEventListener('click', function () {
    openDialog({ title: 'Clear all local data?', message: 'This removes every saved project and your settings from this browser. It cannot be undone.', okText: 'Clear everything', danger: true }).then(function (yes) {
      if (!yes) return;
      storageRemove(KEYS.projects); storageRemove(KEYS.settings); storageRemove('lpps.projects.v1.damaged');
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
  const base = $('#f-design-baseStyleId'); base.textContent = '';
  base.append(el('option', { value: 'auto' }, 'Automatic (best rule-based match for my brief)'));
  STYLES.forEach(function (s) { base.append(el('option', { value: s.id }, s.name)); });
  fillSelect($('#f-design-recommend-personality'), PERSONALITY, 'Select...');
  fillSelect($('#f-design-recommend-emotion'), EMOTION, 'Select...');
  fillSelect($('#f-design-recommend-price'), PRICE, 'Select...');
  fillSelect($('#f-design-recommend-audience'), AUDIENCE, 'Select...');
  const gc = $('#gallery-category'); gc.textContent = ''; gc.append(el('option', { value: '' }, 'All categories'));
  CATEGORIES.forEach(function (c) { if (STYLES.some(function (s) { return s.categories.indexOf(c[0]) !== -1; })) gc.append(el('option', { value: c[0] }, c[1])); });
}

function init() {
  detectStorage();
  loadSettings();
  loadProjects();
  populateSelects();
  bindEvents();
  showView('dashboard', false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
