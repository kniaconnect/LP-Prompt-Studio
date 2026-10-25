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
   6b. Gemini         – optional: user's own Google AI Studio key, sends the prompt
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

/* =====================================================================
   FORMULA EXECUTION ENGINE
   FORMULAS (above) stays as the UI list. FORMULA_SPECS holds what the
   prompt composer actually executes: stages, where each stage lives in
   the page (adapted to the sections the user switched on), headline and
   body strategy, transitions, CTA strategy and validation rules.
   "at" = preferred sections, "fb" = fallbacks, "pos" = last resort
   (first, middle or last enabled section).
   ===================================================================== */
const FORMULA_SPECS = {
  aida: {
    purpose: 'Move a cold reader in one forward line: notice, understand, want, act.',
    stages: [
      { key: 'Attention', pos: 'start', at: ['hero'], fb: [], job: 'Hook with a specific line that names the reader situation or the outcome they want. The hero earns the next scroll; it does not explain everything.' },
      { key: 'Interest', pos: 'mid', at: ['problem', 'solution'], fb: ['hero'], job: 'Show you understand their situation, then connect it to what the product is and how it helps, in plain words.' },
      { key: 'Desire', pos: 'mid', at: ['benefits', 'features', 'included', 'proof', 'bonus', 'how'], fb: ['solution', 'hero'], job: 'Make the outcome tangible: concrete benefits, what is inside, what makes it different, and only real proof.' },
      { key: 'Action', pos: 'end', at: ['offer', 'final'], fb: [], job: 'State the offer plainly (what they get, the price if supplied) and give one obvious next step.' }
    ],
    headline: 'Open with a specific hook that names the audience situation or desired outcome, not the product category. The subheadline adds who it is for and the concrete thing they receive.',
    body: 'Each section advances one letter of AIDA and adds a new argument. Order of persuasion: reader situation, product, value, offer. Short paragraphs, concrete nouns.',
    transitions: 'The hero ends on a promise the next section pays off. Interest ends by naming the gap the product fills. Desire ends by pointing to the offer. Use bridging sentences, not repeated headings.',
    cta: 'One primary CTA with the same label everywhere. Show it in the hero (Attention can convert early), after Desire, and in the closing band. The Action block states offer, price and next step in that order.',
    validate: ['Hook, interest-building explanation, desire-building benefits or proof, and an explicit action block are all findable.', 'The hero does not retell the whole product.', 'No section repeats the hero promise in new words.'],
    secondary: { targets: ['hero', 'offer', 'final'], text: 'Use AIDA only for the hero hook (Attention) and the closing offer (Action).' }
  },
  pas: {
    purpose: 'Win readers who already feel a specific pain: name it exactly, make the cost of ignoring it felt, then present the product as the relief.',
    stages: [
      { key: 'Problem', pos: 'start', at: ['problem'], fb: ['hero'], job: 'Name the pain in the reader own words using the problem from the brief. Two or three recognisable situations, no vague "struggling".' },
      { key: 'Agitate', pos: 'start', at: ['problem'], fb: ['hero', 'solution'], job: 'Spell out the practical cost of leaving it as is (time, effort, money, missed chances). Honest and proportionate: no catastrophising, no statistics, no fear tactics.' },
      { key: 'Solution', pos: 'mid', at: ['solution', 'benefits', 'features', 'how', 'included'], fb: ['hero'], job: 'Pivot with one clear sentence, then show how the product removes the pain, backed by its real contents and benefits.' }
    ],
    headline: 'The headline names the pain, the unwanted situation, or promises its removal, in the reader own words. It must be recognisable to the target audience at first glance.',
    body: 'Problem first, product second. Spend roughly the first third of the page on the pain, then pivot once. Benefits are written as relief from the named pain, not as generic positives.',
    transitions: 'One explicit pivot sentence between Agitate and Solution (for example "That is why..."). It happens once. Later sections refer back to the pain instead of restating it.',
    cta: 'The primary CTA appears after the Solution pivot, not before the pain is named. The label promises relief or the next concrete step. The closing CTA repeats the relief in one line.',
    validate: ['The pain is named specifically in the first screen or the problem section.', 'Agitation stays practical and has no invented numbers.', 'A single, visible pivot from problem to solution exists.'],
    secondary: { targets: ['problem', 'solution'], text: 'Use PAS inside the problem and solution sections only.' }
  },
  '4p': {
    purpose: 'Paint the result first, promise it realistically, prove it with what really exists, then nudge.',
    stages: [
      { key: 'Picture', pos: 'start', at: ['hero'], fb: ['problem'], job: 'Describe the desired situation concretely: a scene or outcome the reader can imagine, not an adjective.' },
      { key: 'Promise', pos: 'mid', at: ['solution', 'benefits'], fb: ['hero'], job: 'State what the product delivers and for whom, realistically, without guaranteed results.' },
      { key: 'Prove', pos: 'mid', at: ['included', 'how', 'features', 'proof'], fb: ['benefits', 'solution'], job: 'Back the promise with evidence that exists in the brief: exact contents, the process, supplied proof. If there is no real proof, prove with specifics, never with invented testimonials.' },
      { key: 'Push', pos: 'end', at: ['offer', 'final'], fb: [], job: 'Nudge to the next step: clear offer, low-friction CTA, and a reason to act that is true.' }
    ],
    headline: 'The headline pictures the achieved outcome as a concrete situation. The subheadline carries the promise and the audience.',
    body: 'Start from the end result and work backwards to the product. Every promise made must be followed by something concrete in Prove.',
    transitions: 'Move from picture to promise ("Here is how"), from promise to proof ("Here is what is inside"), from proof to push ("Ready when you are") using short connecting lines.',
    cta: 'CTA wording continues the picture ("Start..."/"Mulai...", "Get..."). Gentle push, no pressure language, same primary label throughout.',
    validate: ['The first screen shows a concrete outcome, not only a product name.', 'Each promise has matching evidence in the Prove sections.', 'The push contains no invented scarcity.'],
    secondary: { targets: ['hero', 'included', 'proof', 'how'], text: 'Use the Picture idea in the hero subheadline and the Prove idea in the contents, process or proof sections.' }
  },
  fab: {
    purpose: 'Turn a list of things the product has into reasons to buy, by always travelling from feature to advantage to benefit.',
    stages: [
      { key: 'Feature', pos: 'mid', at: ['features', 'included', 'how'], fb: ['solution', 'benefits'], job: 'State exactly what exists, using only features and contents named in the brief. Never add a feature that was not supplied.' },
      { key: 'Advantage', pos: 'mid', at: ['features', 'included', 'how'], fb: ['solution', 'benefits'], job: 'Say what that feature lets the customer do or why it is better than the usual alternative.' },
      { key: 'Benefit', pos: 'mid', at: ['benefits', 'features', 'included'], fb: ['solution'], job: 'Say what changes in the customer life or work as a result, in terms the target audience cares about.' }
    ],
    headline: 'Build the headline from the strongest benefit (not from a feature), and let the subheadline name the key feature that makes it possible.',
    body: 'Write 3 to 6 feature units. Each unit is a short block that contains all three parts in order: feature, advantage, benefit. Headings lead with the benefit, details show the feature. Do not stop at a bullet list of features.',
    transitions: 'Group units by customer goal (for example saves time, reduces mistakes) and introduce each group with one sentence that links it to the audience.',
    cta: 'CTA refers to the main benefit or the set of features together ("Get all ... "), placed after the feature units and in the closing band.',
    validate: ['Every important feature is followed by an advantage and a benefit.', 'No feature appears that is missing from the brief.', 'Benefits differ from each other and are not reworded repeats.'],
    secondary: { targets: ['features', 'included', 'benefits'], text: 'Use FAB only for the feature, included and benefit blocks: every item gets feature, advantage and benefit.' }
  },
  bab: {
    purpose: 'Show a believable before, a modest after, and the product as the bridge between them.',
    stages: [
      { key: 'Before', pos: 'start', at: ['problem'], fb: ['hero'], job: 'Describe the current situation of the reader, concretely and without exaggeration.' },
      { key: 'After', pos: 'mid', at: ['solution', 'benefits'], fb: ['hero'], job: 'Describe the realistic improved situation. Modest, specific, and free of guaranteed results or timelines you cannot support.' },
      { key: 'Bridge', pos: 'mid', at: ['how', 'included', 'solution', 'offer'], fb: ['benefits'], job: 'Explain how the product gets them from Before to After: the steps, the contents, the support supplied in the brief.' }
    ],
    headline: 'The headline expresses the shift ("from X to Y") or the After state in concrete terms. Avoid dramatic or unprovable transformations.',
    body: 'Mirror the structure: a Before block, an After block that contrasts directly with it, then the Bridge. Use parallel wording so the contrast is obvious.',
    transitions: 'Use a clear hinge between Before and After ("Now picture...") and another into Bridge ("The way there is..."). Reuse the same nouns in Before and After so the change is visible.',
    cta: 'CTA invites the reader to start crossing the bridge ("Start...", "Begin..."), placed after the Bridge and in the closing band.',
    validate: ['A recognisable Before and a contrasting After both appear.', 'The After makes no guaranteed or numeric result claims that the brief lacks.', 'The Bridge shows how, using only supplied facts.'],
    secondary: { targets: ['solution', 'benefits', 'how'], text: 'Use BAB inside the benefits or solution blocks to contrast the old and new situation.' }
  },
  pastor: {
    purpose: 'Long-form persuasion that walks from the problem to a response, with a short story in the middle.',
    stages: [
      { key: 'Problem', pos: 'start', at: ['problem'], fb: ['hero'], job: 'Name the main problem clearly in the first lines.' },
      { key: 'Amplify', pos: 'start', at: ['problem'], fb: ['hero', 'solution'], job: 'Show the consequence of leaving it unsolved in practical terms. No fabricated stakes.' },
      { key: 'Story', pos: 'mid', at: ['solution', 'proof'], fb: ['hero', 'benefits'], job: 'A short story or origin only from facts supplied in this brief. If no story facts exist, write a brief honest "why this exists" using only the description; never invent a personal tale, case study or testimonial.' },
      { key: 'Transformation', pos: 'mid', at: ['benefits', 'solution'], fb: ['hero'], job: 'Describe what changes for the customer, realistic and specific.' },
      { key: 'Offer', pos: 'end', at: ['offer', 'included', 'bonus'], fb: ['benefits', 'final'], job: 'Present exactly what they get, the supplied price and bonuses, and how access works.' },
      { key: 'Response', pos: 'end', at: ['final', 'offer'], fb: [], job: 'Ask for the action directly and tell the reader exactly what happens after they click.' }
    ],
    headline: 'The headline states the problem or the transformation promise in one strong line. The subheadline hints at the story or the way out.',
    body: 'Follow the six stages in order as a continuous argument. Use more narrative flow than other formulas, with short paragraphs and a human voice, but stay inside supplied facts.',
    transitions: 'Each stage hands over to the next with a short linking sentence. The Story must connect to the Transformation by naming what changed.',
    cta: 'The Offer states price and contents; the Response is a direct, specific CTA. Repeat the primary CTA after Transformation as well.',
    validate: ['All six stages are present in order, or merged where a section is off.', 'The Story uses only supplied facts and contains no invented testimonial or personal anecdote.', 'The Offer uses the exact supplied prices.'],
    secondary: { targets: ['problem', 'solution', 'offer'], text: 'Use the PASTOR flow for the problem, story and offer blocks (Amplify, Story, Offer).' }
  },
  '4u': {
    purpose: 'A headline lens: every headline and subheadline must be useful, unique, ultra-specific, and urgent only when that is real.',
    stages: [
      { key: 'Useful', pos: 'start', at: ['hero', 'final'], fb: [], job: 'The headline promises something the target reader actually wants or needs.' },
      { key: 'Urgent', pos: 'start', at: ['hero', 'offer', 'final'], fb: [], job: 'Only if the brief states a real deadline, limit or time-bound offer. Otherwise leave urgency out completely.' },
      { key: 'Unique', pos: 'start', at: ['hero', 'solution'], fb: [], job: 'Say what differs from the alternatives, based only on facts in the brief.' },
      { key: 'Ultra-specific', pos: 'start', at: ['hero', 'benefits', 'final'], fb: [], job: 'Use concrete nouns, formats, audiences, counts or outcomes found in the brief, not vague adjectives.' }
    ],
    headline: 'Draft several headlines internally and score each on the four U. Keep the best one and keep it under about 12 words.',
    body: 'Apply the lens to the hero headline, subheadline, every section heading, and the closing headline. Body text stays plain and informative.',
    transitions: 'Section headings should read as a sequence of specific promises, not labels like "Benefits" or "About".',
    cta: 'CTA label is itself specific (names the product or outcome) rather than "Click here" or "Submit".',
    validate: ['Each heading is specific enough that it could not be pasted onto a different product.', 'No urgency appears unless the brief provides a real reason.', 'Headings are not repeated in different words.'],
    secondary: null
  }
};

/* Goal-specific CTA strategy used by the copy engine. */
const GOAL_CTA = {
  digital: 'Name the action and what they get (for example "Get the [product name]"). If no label is supplied, propose one. Place the primary CTA in the hero, after the offer and at the end. Under the button add one line of real reassurance only if the brief supports it (for example how access is delivered).',
  service: 'Make the CTA a low-friction next step such as booking or asking a question. State what happens after the click (for example a reply or a short consultation). Do not promise availability or response times that are not in the brief.',
  leads: 'Offer a clear exchange: what they get for their contact details. Keep the form ask minimal, and use a verb that names the benefit rather than "Submit".',
  brand: 'Invite the visitor to connect, collaborate or follow. Offer two clear paths at most (for example message and see work), with one primary.',
  physical: 'Use a purchase verb with the product name or variant. Show price and any facts about the product before the button. Never invent shipping, stock or warranty terms.',
  course: 'Make the CTA about joining or starting. Say what they gain by joining (for example access to the lessons described) and how the learning is delivered if the brief says so.',
  other: 'Derive the CTA from the main action described in the brief and keep it specific.'
};

/* The unique job each section must do. Used to stop copy repeating itself. */
const SECTION_JOB = {
  hero: 'Say what it is, who it is for and the single outcome. Show the primary CTA.',
  problem: 'Name the reader situation and its practical cost. Introduces no product claims.',
  solution: 'Introduce the product as the answer: what it is, how it approaches the problem, who it suits.',
  benefits: 'Translate the product into different outcomes. One distinct outcome per line, never rewordings.',
  features: 'List the concrete capabilities, each tied to why it matters to this audience.',
  how: 'Show the path to the result in 3 or 4 simple steps. Lowers effort anxiety.',
  included: 'Itemise exactly what the buyer receives, using only what the brief states.',
  proof: 'Real evidence only. If none was supplied, omit the section or use truthful trust elements such as exact contents or process.',
  offer: 'Price, what is being bought, how access works and one CTA. Resolve the last objection.',
  bonus: 'Extras supplied in the brief, positioned as added value. Never invent a bonus.',
  faq: 'Answer 4 to 6 real doubts that earlier sections did not already cover. Every answer adds new information.',
  final: 'Restate the outcome in one line and show one CTA. No new arguments.'
};

function enabledSectionIds(p) { return p.sections.filter(function (s) { return s.enabled; }).map(function (s) { return s.id; }); }
function sectionNameOf(id) { return SECTION_BY_ID[id] ? SECTION_BY_ID[id].name : id; }

function resolveStageSections(st, on) {
  let ids = st.at.filter(function (id) { return on.indexOf(id) !== -1; });
  if (!ids.length && st.fb) ids = st.fb.filter(function (id) { return on.indexOf(id) !== -1; });
  if (!ids.length && on.length) ids = [st.pos === 'end' ? on[on.length - 1] : st.pos === 'mid' ? on[Math.floor((on.length - 1) / 2)] : on[0]];
  ids.sort(function (a, b) { return on.indexOf(a) - on.indexOf(b); });
  return ids.slice(0, 4);
}

/* Which formula leads, which support it, and where each stage lands. */
function resolveFormulaPlan(p) {
  const c = p.content, on = enabledSectionIds(p);
  const chosen = (c.formulas || []).filter(function (id) { return FORMULA_SPECS[id]; });
  const lens4u = chosen.indexOf('4u') !== -1;
  const frames = chosen.filter(function (id) { return id !== '4u'; });
  let primary, secondary = [], auto = false, note = '';
  if (!frames.length) {
    auto = true; primary = 'aida';
    if (String(p.brief.problem || '').trim() && on.indexOf('problem') !== -1) secondary = ['pas'];
    note = chosen.length ? '4U only shapes headlines, so AIDA is used as the page skeleton.' : 'No formula was chosen, so AIDA leads and PAS supports the problem and solution blocks where a problem was supplied.';
  } else {
    primary = frames[0]; secondary = frames.slice(1);
    note = frames.length > 1 ? 'The first formula chosen is the page skeleton. The others are applied only to the blocks named below.' : '';
  }
  const spec = FORMULA_SPECS[primary];
  const stages = spec.stages.map(function (st) { return { key: st.key, job: st.job, sections: resolveStageSections(st, on) }; });
  const support = secondary.map(function (id) {
    const s = FORMULA_SPECS[id].secondary;
    const targets = s ? s.targets.filter(function (t) { return on.indexOf(t) !== -1; }) : [];
    return { id: id, text: s ? s.text : '', targets: targets, applied: targets.length > 0 };
  });
  return { primary: primary, secondary: support, lens4u: lens4u, auto: auto, note: note, stages: stages, spec: spec };
}

function hasUrgencySource(p) {
  const t = [p.content.notes, p.content.brandNotes, p.content.headline].join(' ');
  return /deadline|batas waktu|sampai tanggal|hingga tanggal|berakhir|until|ends on|limited|terbatas|kuota|early bird|hari terakhir|last day/i.test(t);
}
function hasStoryFacts(p) { return !!(String(p.content.brandNotes || '').trim() || String(p.content.socialProof || '').trim() || String(p.content.notes || '').trim()); }

/* =====================================================================
   STYLE DNA ENGINE
   One DNA record per style id. Existing style objects (palette, fonts,
   fit...) are untouched; DNA adds the structural grammar. Styles added
   later without DNA fall back to deriveDNA() so nothing breaks.
   ===================================================================== */
const STYLE_DNA = {
  mono: {
    sig: 'A printed fashion or architecture magazine: black ink on white, big serif type, ruled columns, no boxes.',
    roles: 'Ink does everything: text, rules and the primary button. There is no second hue. Surface tint is only for rare quiet fields.',
    type: 'Display: oversized light-weight serif, tracking about -0.03em, line-height near 0.95; hero headline 56 to 96px on desktop, 34 to 44px on phones. Labels: 11 to 12px uppercase sans, +0.16em tracking. Body: neutral sans 16 to 17px, line-height 1.6, always left aligned.',
    headline: 'The headline is the dominant graphic element, left aligned, allowed to break over three or four lines. At most one italic or underlined word.',
    hero: 'Asymmetric two columns: a very large headline column (about 60 to 65%) and a tall 3:4 solid black or desaturated image block on the right, aligned to the bottom of the text. A 2px black rule runs under a small uppercase masthead.',
    rhythm: 'Sections are separated by full-width 1px black rules, never by boxes or background fills. Use an editorial grid: a narrow left column holding the numbered uppercase section label, a wide right column holding the content.',
    text: 'Problem and solution read as editorial copy: label column left, a 60ch paragraph column right, opening sentence set larger in serif like a standfirst.',
    list: 'Numbered editorial rows: large serif numeral at left, bold title and one-line explanation at right, a 1px rule above every row. No cards, no icons.',
    card: 'No cards. Product facts form a ruled table-like block: uppercase label left, value right, hairline between rows. Square corners and no shadow.',
    proof: 'Real quotes as large serif pull-quotes with an em-dash attribution, separated by rules. If no proof exists, omit.',
    pricing: 'Price set large in light serif, regular price struck through in grey beside it, included items as ruled rows below, CTA left aligned directly under.',
    badge: 'No pill badges. Labels are small uppercase text with a 1px black underline, or a square 1px outlined tag.',
    button: 'Solid black rectangle, 0 radius, white uppercase text 12 to 13px with +0.16em tracking, padding about 18px 32px, no shadow.',
    secondary: 'Underlined black text link with an arrow character, same size as the button text. Never a second filled button.',
    surface: '1 to 2px black rules only. No shadows, no gradients, no rounded corners.',
    image: 'Black and white or strongly desaturated, tall 3:4 crops. With no image, a solid black block with a giant serif initial.',
    space: 'Strict left-aligned grid. About 96px vertical section padding on desktop and 56px on phones.',
    faq: 'Ruled rows: serif question, plus or minus sign at the far right, 1px rule between rows. No boxes.',
    final: 'A full-bleed black band, a giant white serif closing line, and a white rectangular button.',
    states: { web: 'On hover invert the primary button (white fill, black text, 1px black border). Always show a visible focus outline.', lynk: 'No hover states. The button is static and recognisable by its solid black fill.' },
    forbidden: ['rounded corners', 'drop shadows', 'gradients', 'colour accents', 'decorative icons', 'a centered hero', 'card grids', 'pill buttons'],
    lynk: 'Draw rules with border-top:1px solid #0B0B0B on inline-styled divs. Build the two-column hero as a flex-wrap container whose children use flex:1 1 260px so it stacks on phones with the headline first and the black block after. Numerals are inline-block spans.'
  },
  luxury: {
    sig: 'A quiet private-members brand: charcoal ground, muted gold hairlines, centered symmetry and a lot of empty space.',
    roles: 'Charcoal is the stage; warm ivory is text; gold is reserved for hairlines, labels, numerals and the primary button. Never use gold for large fills.',
    type: 'Display: high-contrast serif (Didone feel) at 36 to 64px, normal weight, +0.01em tracking, centered. Labels: small capitals at 11px with +0.3em tracking in gold. Body: light sans 15 to 16px, line-height 1.8, muted ivory.',
    headline: 'Centered, short lines (max about 16 characters per line), calm and symmetrical, never bold. Allow a thin gold rule 40px wide beneath.',
    hero: 'Centered and symmetrical: small tracked capitals masthead, headline centered, then an inset image in a thin gold hairline frame with 12px padding between image and frame, about half the container width, then the button. Generous empty space around everything.',
    rhythm: 'Every section is a centered column with very large vertical padding (about 120px desktop, 72px phones), separated by a 40px gold hairline or a thin full rule. Sections do not use background boxes.',
    text: 'Centered paragraphs at about 52ch with a small tracked-caps eyebrow above each heading.',
    list: 'Three or four evenly spaced columns separated by vertical hairlines, each with a gold serif numeral, a small caps title and a light line of text. On phones stack them with a hairline between. No icons, no boxes.',
    card: 'No rounded cards. Where a container is needed use an inner frame: 1px gold hairline, 2px radius at most, with a second inset hairline offset by 8px.',
    proof: 'One quote at a time, centered, italic serif, gold quotation mark, attribution in small caps. Omit if no real proof.',
    pricing: 'Hierarchy through type, not decoration: small caps label, price in large light serif in gold, regular price struck through in muted ivory, one hairline, then the button. No badges or starbursts.',
    badge: 'Tiny tracked capitals in gold, either plain or between two short hairlines. Never filled pills.',
    button: 'Primary: transparent fill, 1px gold border, gold text in tracked small capitals, padding about 18px 40px, 0 to 2px radius. It may fill with gold and charcoal text where it is the single final action.',
    secondary: 'Plain tracked-caps text link in muted ivory with a thin underline.',
    surface: '1px hairlines in gold at low opacity. No drop shadows, no glows, no gradients.',
    image: 'Dark, moody editorial crops with warm highlights, shown inside the inset hairline frame.',
    space: 'Whitespace is the luxury signal. Keep text columns narrow and let empty space dominate.',
    faq: 'Centered accordion: serif question between two hairlines, small plus sign in gold, answer in light sans.',
    final: 'Charcoal-on-slightly-lighter band with a single centered serif sentence, a gold hairline above it and one outlined gold button.',
    states: { web: 'On hover fill the primary button with gold and switch the text to charcoal. Keep a visible focus outline.', lynk: 'No hover states. Keep the outlined gold button static.' },
    forbidden: ['bright saturated colours', 'playful shapes', 'bold sans headlines', 'crowded layouts', 'glow effects', 'rounded modern cards', 'drop shadows'],
    lynk: 'Set the page background on the root div to charcoal. Build hairlines with border-top:1px solid with a gold rgba value. The inset frame is two nested divs with 1px borders. Center everything with text-align:center and margin:0 auto.'
  },
  neo: {
    sig: 'A loud poster pinned to a cork board: cream paper, thick black outlines, hard offset shadows and sticker labels.',
    roles: 'Cream is the paper; black is every outline and all text; red is the main shout colour; yellow marks buttons, highlights and stickers. White only inside boxes.',
    type: 'Display: ultra-heavy sans (Arial Black or Impact feel), uppercase, tight tracking (-0.02em), line-height 0.98, 40 to 80px, mixed sizes allowed. Body: monospace 15 to 16px, line-height 1.6. Labels: monospace uppercase bold.',
    headline: 'Uppercase, very heavy, with one key phrase highlighted on a yellow block with a 3px black border. A headline may sit slightly rotated (about -1.5 degrees).',
    hero: 'Asymmetric blocks: headline on cream at left, a thick-bordered image frame with an 8px hard shadow slightly rotated (about 2 degrees) at right, a rotated sticker label overlapping the frame corner, and a yellow block behind the frame.',
    rhythm: 'Alternate section backgrounds between cream and a warm yellow-cream, each separated by a 3px black rule. Section titles sit on a yellow tag with a 3px border and a 5px hard shadow. Overlap blocks by a few pixels on purpose, but keep reading order clear.',
    text: 'Copy sits in a white box with a 3px black border and a 6px hard shadow, or on open cream with a bold black first sentence.',
    list: 'Outlined boxes (3px black border, 5px hard shadow, white fill) with a coloured square number tag; every second box rotated about 0.8 degrees. Two columns on desktop, one on phones.',
    card: 'White fill, 3px solid black border, 0 to 4px radius, zero-blur offset shadow of 6px in black. Price sits in a coloured tag at the top corner. Badge overlaps the border.',
    proof: 'Quote on a yellow box with a thick border and a rotated sticker for the attribution. Omit if no real proof.',
    pricing: 'Price on a red block with white text, 3px black border and a 5px hard shadow; regular price struck through next to it in black; the CTA sits right underneath as a yellow block.',
    badge: 'Sticker style: rotated about -3 degrees, yellow or red fill, 3px black border, uppercase monospace bold.',
    button: 'Yellow fill, 3px solid black border, 0 radius, black uppercase heavy text 15 to 17px, padding about 16px 28px, 6px hard black shadow.',
    secondary: 'White-fill button with the same 3px border but no shadow, or an uppercase underlined mono link.',
    surface: 'Every container has a 3px black border. Shadows are hard offsets with 0 blur, never soft. No gradients, no transparency.',
    image: 'Inside a 3px bordered frame with an offset shadow and a flat colour block behind it. No soft crops.',
    space: 'Dense but organised: 56 to 72px section padding, tight gaps between boxes (16 to 20px).',
    faq: 'Each question is its own white box with a 3px border and 4px hard shadow, plus sign in a yellow square.',
    final: 'Full red band with black rule above, a huge uppercase heading on a yellow tag, and the yellow shadowed button.',
    states: { web: 'On hover translate the button by 3px right and down and reduce its shadow to 3px. Keep a visible focus outline.', lynk: 'No hover or press states. Render the button with its static 6px hard shadow.' },
    forbidden: ['soft shadows', 'delicate gradients', 'thin hairlines', 'glass effects', 'muted pastel palettes', 'rounded pill buttons'],
    lynk: 'box-shadow:6px 6px 0 #111 and transform:rotate(-2deg) are allowed inline. Do not use pseudo-elements: build stickers and tags as inline-block spans. Keep rotations small and make sure rotated blocks do not cause horizontal overflow (put overflow:hidden on the section wrappers).'
  },
  nature: {
    sig: 'A ceramic studio or herbal shop: sand paper tones, moss and terracotta, warm serif type and soft organic shapes.',
    roles: 'Sand is the page; moss green is the primary action and key accents; terracotta is a small warm accent for links and emphasis; deep green-black is text.',
    type: 'Display: warm, slightly soft serif at 34 to 60px with italic emphasis on one phrase, normal to semibold weight. Body: humanist sans 16 to 17px, line-height 1.7. Labels: italic serif, sentence case.',
    headline: 'Left aligned or gently centered, sentence case, with one italic phrase in terracotta. Friendly and unhurried.',
    hero: 'Text at left, and at right an image cropped into an organic blob mask (for example border-radius 58% 42% 55% 45% / 48% 56% 44% 52%) with a small leaf-shaped motif overlapping its edge. The hero sits on sand with a soft curved edge into the next section.',
    rhythm: 'Sections flow into each other with large curved top edges (border-radius about 44px 44px 0 0) and alternating sand and deeper sand backgrounds. Use leaf-shaped dividers instead of straight rules.',
    text: 'Short paragraphs at 55ch, sometimes next to an organic-shaped image. Open with an italic serif lead sentence.',
    list: 'Two-column list with leaf-shaped markers (border-radius 0 100% 0 100%) in moss green, bold title, soft supporting line. No boxes.',
    card: 'Soft containers: deeper-sand fill, asymmetric large radius (for example 32px 32px 32px 8px), 1px sand-dark border, very light shadow at most. Image sits at the top in an organic mask.',
    proof: 'A quote on a deeper-sand organic shape with a small leaf mark and the name in italic. Omit if no real proof.',
    pricing: 'Price in warm serif in terracotta on a soft rounded sand panel; regular price struck through lighter; CTA is a moss pill directly beneath.',
    badge: 'Small rounded pill in a pale moss tint with moss text, or a leaf-shaped tag. No heavy outlines.',
    button: 'Pill (fully rounded) moss-green fill, cream text, 15 to 16px, padding about 14px 30px, no border, at most a very light shadow.',
    secondary: 'Terracotta underlined text link, or a pill with a 1px moss outline and moss text.',
    surface: 'Soft 1px sand-dark borders and very light shadows. No hard black borders, no brutalist offset shadows.',
    image: 'Natural light and earthy tones, cropped into organic masks (blob, arch or leaf).',
    space: 'Relaxed, generous breathing room: about 88px section padding desktop, 56px phones.',
    faq: 'Soft rows separated by dashed or dotted sand-dark lines, a small leaf or plus marker, answers revealed in plain text.',
    final: 'Moss green band with a large curved top edge, cream serif closing line and a cream pill button with moss text.',
    states: { web: 'On hover darken the pill slightly and lift it by 1px. Keep a visible focus outline.', lynk: 'No hover states. Keep the pill static.' },
    forbidden: ['neon colours', 'hard black borders', 'sharp tech visuals', 'cold greys', 'heavy drop shadows', 'brutalist offset shadows'],
    lynk: 'Organic masks use inline border-radius with the slash syntax. Draw leaf markers as small inline-block spans with border-radius:0 100% 0 100%. Curved section tops use border-radius on the section wrapper.'
  },
  serene: {
    sig: 'A silent spa brochure: wide whitespace, one calm centered column, sage lines and almost no decoration.',
    roles: 'Warm off-white page; deep sage-grey text; sage green only for hairlines, numerals and the outlined button. Nothing saturated.',
    type: 'Display: light-weight sans (weight 300) at 30 to 54px, relaxed tracking, centered. Body: same sans 16px, line-height 1.9, narrow measure (about 46ch). Labels: tiny uppercase with +0.3em tracking in muted sage.',
    headline: 'Centered, light weight, short, with plenty of space around it. No bold, no uppercase.',
    hero: 'One calm centered column: tiny tracked label, headline, one supporting line, then a small image about 46% wide with very low contrast and big margins, then a thin outlined button. Vast empty space above and below.',
    rhythm: 'A single narrow column (max about 640px) with very large vertical gaps (120px desktop, 80px phones), separated only by a 1px sage hairline between sections. No background changes except the final band.',
    text: 'Centered short paragraphs, each at most three lines, with generous leading.',
    list: 'Spaced rows separated by hairlines: an outlined circle numeral, then a centered title and one soft line. One column only, no grids.',
    card: 'No cards. Everything sits directly on the page, separated by hairlines. Image has a 2px radius at most.',
    proof: 'A single centered quote in light sans, with the name below in tiny tracked caps. Omit if no real proof.',
    pricing: 'Price in light weight at a moderate size, regular price struck through in muted sage, hairline, then a thin outlined button. No badges.',
    badge: 'Tiny tracked uppercase text in muted sage, no container.',
    button: 'Thin 1px sage outline, transparent fill, ink text with +0.12em tracking, 2px radius, padding about 14px 34px.',
    secondary: 'Plain muted text link with a thin underline.',
    surface: '1px sage hairlines only. No shadows, no gradients, no strong colour fills.',
    image: 'Soft, airy, low contrast photography with large margins around it.',
    space: 'Space is the design. When in doubt remove an element rather than add one.',
    faq: 'Hairline-separated rows with a light plus sign; question in light sans, answer in muted text.',
    final: 'A soft surface-tinted band with one centered sentence and the thin outlined button.',
    states: { web: 'On hover fill the button softly with sage at 15% opacity. Visible focus outline.', lynk: 'No hover states. Keep the outlined button static.' },
    forbidden: ['heavy black borders', 'saturated colours', 'dense grids', 'loud badges', 'bold weights', 'drop shadows', 'multi-column card layouts'],
    lynk: 'Constrain the inner wrapper with max-width and margin:0 auto, text-align:center. Use border-top:1px solid for hairlines. Use large inline padding for the vertical gaps.'
  },
  playful: {
    sig: 'A children learning-app poster: flat bright colours, circles, triangles and squares as friendly anchors.',
    roles: 'Cream page, deep navy text, cobalt blue as the main colour, sunny yellow as highlight and button underlay, one small pink accent for shapes.',
    type: 'Display: rounded bold sans (weight 800) at 34 to 66px with a yellow highlighter bar behind one key word. Body: same family, 17px, line-height 1.6, short friendly sentences. Labels: bold, sentence case.',
    headline: 'Left aligned, very bold, with a hand-marked yellow highlight behind one or two words.',
    hero: 'Text left; right a stack of overlapping flat shapes (a large blue circle, a yellow triangle, a pink rounded square) forming a composition with the product image or initial on top. A top bar in cobalt with white brand name.',
    rhythm: 'A stable grid with alternating cream and pale-blue bands. Each section has one small geometric shape as its visual anchor (circle, triangle or square). Rounded section edges are not used.',
    text: 'Short, friendly blocks of text next to a shape; headings carry the yellow highlight bar.',
    list: 'Three-up tiles: each with a different shape marker (circle, rounded square, leaf-triangle) in a different colour, bold title, short line. White fill, 2px navy outline, 14px radius. Stack on phones.',
    card: 'White fill, 2px navy outline, 14px radius, flat colour fills, no gradients, no soft shadows. A shape sits in the top corner.',
    proof: 'A speech-bubble style box with a flat fill and shape-based avatar. Omit if no real proof.',
    pricing: 'Price very large in cobalt on a white rounded tile with a yellow offset underlay; regular price struck through; CTA button directly under.',
    badge: 'Rounded pill in yellow with navy bold text, or a small shape with a short word.',
    button: 'Solid cobalt, white bold text, 14px radius, padding about 16px 30px, with a solid yellow offset underlay (0 6px 0 yellow).',
    secondary: 'White button with a 2px navy outline and navy text, same radius, no underlay.',
    surface: 'Flat solid fills; outlines 2px in navy where needed. No gradients, no blurred shadows.',
    image: 'Cutout or flat illustration on a solid colour shape; shapes may frame the image.',
    space: 'Comfortable and airy: 72 to 88px section padding.',
    faq: 'Each question in its own rounded white tile with a 2px navy outline and a shape-based plus marker.',
    final: 'Full cobalt band, white heading, yellow button with a navy underlay and a couple of shapes at the edges.',
    states: { web: 'On hover reduce the underlay to 3px and shift the button down 3px. Visible focus outline.', lynk: 'No hover states. Keep the static underlay shadow.' },
    forbidden: ['realistic textures', 'thin luxurious serifs', 'muted palettes', 'too many shapes behind text', 'gradients', 'soft glows'],
    lynk: 'Draw shapes as inline-block divs with border-radius:50% (circle) or CSS borders for triangles (inline border trick), no pseudo-elements. Keep shapes absolutely positioned only inside wrappers that have position:relative and overflow:hidden.'
  },
  softfem: {
    sig: 'A boutique editorial: blush and ivory fields, plum type, italic serif accents, arch-shaped imagery and fine rules.',
    roles: 'Ivory-blush page; plum for text, rules and the primary button; lilac and blush as soft colour fields behind imagery and in alternating bands.',
    type: 'Display: high-contrast serif at 34 to 62px with italic emphasis on key words, normal weight. Body: clean humanist sans 16px, line-height 1.7. Labels: small italic serif or spaced small caps in plum.',
    headline: 'Left aligned, large, with one or two italic words in plum. Elegant and calm, never shouty.',
    hero: 'Editorial split: text left, and at right a tall arch-shaped image (top fully rounded, bottom nearly square, 3:4) on a lilac field, with a small star mark and a thin plum rule. Alternating image and text bands follow.',
    rhythm: 'Alternating bands in ivory, blush and lilac. Thin plum rules and small four-point star marks separate sections. Alternate image-left and image-right compositions.',
    text: 'Serif lead sentence in italics followed by sans body, sometimes beside an arch image.',
    list: 'Elegant numbered rows: italic serif numeral in plum, title, supporting line, fine blush rule beneath each. No heavy boxes.',
    card: 'Soft colour field with 4px radius or an arch-topped image; fine 1px plum-tinted border. Name and price sit under the image in serif.',
    proof: 'Large italic serif quote on a lilac field with an arch image. Omit if no real proof.',
    pricing: 'Price in italic serif plum at a large size, regular price struck through in muted plum, fine rule, then the plum button.',
    badge: 'Small italic label or a four-point star plus short word in plum; optional lilac pill with 1px border.',
    button: 'Solid plum fill, cream text, 4px radius, medium weight with +0.06em tracking, padding about 14px 30px.',
    secondary: 'Outlined plum button with the same radius, or an italic underlined link.',
    surface: 'Fine 1px plum-tinted rules and soft colour fields instead of boxes; no heavy shadows, no thick borders.',
    image: 'Portrait or lifestyle photography with soft light, always cropped to an arch.',
    space: 'Spacious editorial spacing: 80 to 96px desktop padding, 56px phones.',
    faq: 'Fine-ruled rows, question in serif, italic plus sign in plum, answer in sans.',
    final: 'A lilac band with a large italic serif closing line and the plum button, star marks either side.',
    states: { web: 'On hover darken the plum slightly. Visible focus outline.', lynk: 'No hover states. Keep the plum button static.' },
    forbidden: ['overly sugary pink', 'crowded boxes', 'thick borders', 'low-contrast grey text', 'neon colours', 'brutalist shadows'],
    lynk: 'Arch shape: border-radius:999px 999px 4px 4px on the image wrapper with overflow:hidden. Draw star marks as a small inline SVG or a text character. Rules are border-top:1px solid with a plum rgba value.'
  },
  vibrant: {
    sig: 'A confident product-launch page: strong cobalt colour fields, a split hero, big prices and unmissable buttons.',
    roles: 'White page and near-black navy text; cobalt is the big colour field and the primary button; yellow is the highlight for the CTA on blue and for badges.',
    type: 'Display: bold compact sans (weight 800) at 36 to 58px, tight tracking (-0.03em), line-height 1.0. Body: clean sans 16px. Prices: extra bold and large (36 to 60px). Labels: uppercase 11px with +0.12em tracking.',
    headline: 'Left aligned, white on the cobalt field, compact and punchy, max about 10 words.',
    hero: 'Split hero with no padding: the left half is a full cobalt colour field with eyebrow, white headline and a yellow button; the right half is a yellow or tinted field holding a clean product shot or product initial on a white tile. On phones stack the blue block first.',
    rhythm: 'Product-forward and tidy: alternate white and pale-tint bands, headings with an 8px yellow bar at their left edge, content aligned on one clean grid.',
    text: 'Short bold lead line then 2 to 3 lines of body text, aligned left on the grid.',
    list: 'A tidy ruled grid: 3 columns on desktop in one outlined container with 1px light borders between cells, each cell with a small cobalt square number or tick, bold title and one line. Stack on phones.',
    card: 'White product card: 1px light border, 8px radius, no shadow; the product on a colour field above, name, price in extra bold, button below. Colour fields carry the weight, not shadows.',
    proof: 'Quote cell inside the same ruled grid, or a pale-tint band with bold quote text. Omit if no real proof.',
    pricing: 'The strongest element on the page: a cobalt block with the price in huge white extra bold, regular price struck through in light blue, yellow badge showing the saving only if both prices are supplied, and a yellow button.',
    badge: 'Solid yellow rectangle (4px radius) with bold navy uppercase text, or a cobalt small tag.',
    button: 'Large rectangular button, 8px radius, cobalt fill with white bold text (or yellow with navy text on cobalt), padding about 16px 32px, full width on phones.',
    secondary: 'Outlined 2px cobalt button with cobalt text, same size, no fill.',
    surface: 'Colour fields instead of shadows; 1px light borders for structure. No heavy drop shadows, no gradients.',
    image: 'Clean product shots on a flat colour field with strong crops.',
    space: 'Efficient and tidy: 64 to 80px desktop section padding, 44px phones.',
    faq: 'Ruled rows inside a clean container with a bold question and a cobalt plus sign.',
    final: 'Full yellow band with navy bold headline and a cobalt button, price repeated if supplied.',
    states: { web: 'On hover darken the cobalt slightly and lift by 1px. Visible focus outline.', lynk: 'No hover states. Keep buttons static.' },
    forbidden: ['rainbow palettes', 'many decorative shapes', 'soft pastel washes', 'heavy shadows', 'centered thin serif luxury styling'],
    lynk: 'Build the split hero with a flex-wrap container: each half flex:1 1 240px, the blue half first. Colour fields are just background-color on inline-styled divs. Grid cells use display:flex with flex-wrap and border-right/border-bottom 1px.'
  }
};

function deriveDNA(s) {
  const avoid = String(s.avoid || '').split(/,\s*/).filter(Boolean);
  return {
    sig: s.description || s.name, roles: 'Use the palette roles consistently: background, surface, text, muted text, lines, accent and secondary accent.',
    type: s.typography, headline: s.typography, hero: s.layout, rhythm: s.layout, text: s.layout, list: s.components, card: s.components, proof: s.components,
    pricing: 'Show price prominently with the style typography; regular price struck through if both prices exist.', badge: s.components,
    button: s.cta, secondary: 'Quieter than the primary: a text link or an outlined button.', surface: s.components, image: s.image, space: s.layout,
    faq: s.components, final: s.cta,
    states: { web: 'Subtle hover feedback and a visible focus outline.', lynk: 'No hover states. Keep elements static.' },
    forbidden: avoid, lynk: 'Translate every effect into inline CSS that needs no pseudo-elements.'
  };
}
function getDNA(style) { return STYLE_DNA[style.id] || deriveDNA(style); }

/* Text used inside the mockup (not the app UI). */
const L10N = {
  en: {
    sec: { problem: 'The problem', solution: 'The solution', benefits: 'Benefits', features: 'Features', how: 'How it works',
           included: 'What\'s included', proof: 'Social proof', offer: 'Offer and pricing', bonus: 'Bonus', faq: 'Questions' },
    cta: { digital: 'Get the product', service: 'Book a consultation', leads: 'Join the list', brand: 'Get in touch',
           physical: 'Shop now', course: 'Join the course', other: 'Learn more' },
    forAudience: 'For ', yourProduct: 'Your product', placeholder: 'Content for this part will be written from your brief.',
    noPrice: 'No price entered yet.', noProof: 'No real proof provided. The prompt will tell Claude to skip this or use truthful trust elements.',
    step: 'Step', provided: 'Provided by you', imageArea: 'Product image area', secondary: 'See what is inside',
    badge: { digital: 'Digital product', service: 'Service', leads: 'Join the list', brand: 'Personal brand', physical: 'Physical product', course: 'Course', other: 'Featured' }
  },
  id: {
    sec: { problem: 'Masalahnya', solution: 'Solusinya', benefits: 'Manfaat', features: 'Fitur', how: 'Cara kerja',
           included: 'Isi paket', proof: 'Bukti sosial', offer: 'Penawaran', bonus: 'Bonus', faq: 'Pertanyaan umum' },
    cta: { digital: 'Dapatkan Sekarang', service: 'Jadwalkan Konsultasi', leads: 'Daftar Sekarang', brand: 'Hubungi Saya',
           physical: 'Beli Sekarang', course: 'Gabung Sekarang', other: 'Pelajari Selengkapnya' },
    forAudience: 'Untuk ', yourProduct: 'Produk kamu', placeholder: 'Isi bagian ini akan ditulis dari brief kamu.',
    noPrice: 'Harga belum diisi.', noProof: 'Belum ada bukti nyata. Prompt akan meminta Claude melewati bagian ini atau memakai elemen kepercayaan yang jujur.',
    step: 'Langkah', provided: 'Dari kamu', imageArea: 'Area gambar produk', secondary: 'Lihat isinya',
    badge: { digital: 'Produk digital', service: 'Jasa', leads: 'Gabung daftar', brand: 'Brand personal', physical: 'Produk fisik', course: 'Kelas', other: 'Pilihan' }
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

const KEYS = { projects: 'lpps.projects.v1', settings: 'lpps.settings.v1', gemini: 'lpps.gemini.v1' };
const GEMINI_SESSION_KEY = 'lpps.gemini.session';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/';
const GEMINI_DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-pro-latest'];
const MAX_STORED_IMAGE_CHARS = 700000; // about 500 KB of image data

const state = {
  view: 'dashboard',
  projects: [],
  settings: { platform: 'lynk', language: 'id', geminiModel: 'gemini-flash-latest' },
  gemini: { key: '', remember: false, models: [], busy: false, controller: null, status: { msg: '', kind: 'info' } },
  gen: null,           // last Gemini answer: { projectId, text, model, finish }
  genViewport: 'desktop',
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
    id: uid(), name: '', createdAt: t, updatedAt: t, step: 1, maxStep: 1, aiMode: 'none',
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
  if (p.aiMode !== 'none' && p.aiMode !== 'gemini') p.aiMode = 'none';
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
    if (s && typeof s.geminiModel === 'string' && /^[A-Za-z0-9._-]{3,80}$/.test(s.geminiModel)) state.settings.geminiModel = s.geminiModel;
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
        el('span', { class: 'pv-badge' }, L.badge[p.brief.goal] || L.badge.other),
        el('p', { class: 'pv-eyebrow' }, p.brief.productName.trim() || L.yourProduct),
        el('h1', { class: 'pv-h1' }, hl.text),
        hl.sub ? el('p', { class: 'pv-lead' }, hl.sub) : null,
        el('div', { class: 'pv-cta-row' }, ctaButton(p, L), ctx.many ? el('span', { class: 'pv-link' }, L.secondary) : null)),
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
    return secShell('offer', ctx, ctx.L.sec.offer, el('div', { class: 'pv-offer pv-offer-box' }, price, el('div', { class: 'pv-cta-row' }, ctaButton(ctx.p, ctx.L))));
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
    pv.append(SECTION_RENDER[id]({ p: p, L: L, style: style, num: num || 1, many: ids.length > 2 }));
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

const SECTION_DNA_FIELD = {
  hero: 'hero', problem: 'text', solution: 'text', benefits: 'list', features: 'list', how: 'list', included: 'list',
  proof: 'proof', offer: 'pricing', bonus: 'list', faq: 'faq', final: 'final'
};

const GENERIC_PHRASES = '"Unlock your potential", "Transform your life", "Level up your business", "Solusi terbaik untuk Anda", "Take it to the next level", "Rahasia sukses", "Dapatkan hasil maksimal"';

function formulaName(id) { const f = FORMULAS.filter(function (x) { return x.id === id; })[0]; return f ? f.name : id; }

/* Pure function: project in, prompt text out. Twelve sections, fixed order. */
function buildPrompt(p) {
  const b = p.brief, c = p.content, d = p.design;
  const style = getStyle(resolveStyleId(p));
  const dna = getDNA(style);
  const plan = resolveFormulaPlan(p);
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
  const hasPrice = !!(c.regularPrice.trim() || c.promoPrice.trim());

  out.push('# Landing page build brief: ' + (p.name.trim() || b.productName.trim() || 'Untitled project'));
  out.push('');
  out.push('You are a senior conversion copywriter, art director and front-end developer. Build ONE complete landing page from the brief below. Work only from facts in this brief; where a fact is missing, follow the "do not invent" rules.');
  out.push('');
  out.push('**Priority order when two instructions collide (highest first):**');
  out.push('1. Platform technical limits and working functionality (section 8).');
  out.push('2. The chosen Style DNA (sections 5 and 7).');
  out.push('3. Content hierarchy and the conversion objective (sections 2, 3, 4 and 6).');
  out.push('4. Responsiveness and accessibility (section 10).');
  out.push('5. Extra visual preferences from the user (brand colours, brand notes).');
  out.push('When something cannot be done exactly as written, keep the higher-priority rule and translate the lower one into a technique that still works. Never mention such conflicts on the page.');
  out.push('');
  out.push('Do not fall back to a default modern landing page. Unless the Style DNA explicitly asks for them, do NOT produce: a centered hero, rounded white cards, soft shadows, gradient backgrounds, pill buttons, three-column feature grids, decorative icons, or the same layout repeated in every section.');

  /* 1 */
  H('1. Product brief and audience context');
  out.push('- Project: ' + (p.name.trim() || b.productName.trim()));
  out.push('- Platform: ' + (lynk ? 'Lynk.id (' + pageType + ')' : 'Standard website'));
  out.push('- Language of all visible page copy: ' + lang);
  line('Product or business name', b.productName);
  line('Category', labelOf(CATEGORIES, b.category), 'Not specified.');
  line('What it is', b.description);
  line('Target audience', b.audience);
  line('Main customer problem', b.problem, 'Not provided. Infer only a mild, general problem from the description. Add no statistics or dramatic claims.');
  line('Main benefit or desired outcome', b.benefit, 'Not provided. Derive benefits only from the description above.');
  out.push('');
  out.push('Before writing, work out these seven points privately and do not print them: (1) who exactly the reader is, (2) their main need or problem, (3) what the product is and includes, (4) the one or two benefits that matter most to them, (5) why this product deserves consideration, (6) what doubt would stop them buying, (7) what action you want after reading. Use only the facts above or reasonable inferences from them.');

  /* 2 */
  H('2. Conversion objective');
  out.push('- Goal: ' + goalLabel(p));
  out.push('- What the page must do: ' + (GOAL_FOCUS[b.goal] || GOAL_FOCUS.other));
  line('Primary call to action label', c.ctaLabel, 'Not provided. Propose one short, specific CTA label in the page language and use it consistently.');
  line('CTA destination URL', c.ctaUrl, 'Not provided. Use a clearly marked placeholder href such as "#cta-link-here" and tell me where to replace it.');
  out.push('- CTA strategy for this goal: ' + (GOAL_CTA[b.goal] || GOAL_CTA.other));
  if (hasPrice) {
    out.push('- Pricing to show: ' + [c.regularPrice.trim() ? 'regular price ' + c.regularPrice.trim() : '', c.promoPrice.trim() ? 'promotional price ' + c.promoPrice.trim() : ''].filter(Boolean).join('; ') +
      '. Use these exact figures. ' + (c.regularPrice.trim() && c.promoPrice.trim() ? 'Show the regular price crossed out beside the promotional price. Do not state a percentage unless it is simple arithmetic from these two figures.' : 'Do not add a crossed-out price or a discount.'));
  } else {
    out.push('- Pricing: no price was supplied. Do not show or invent any price or discount. If an offer section exists, describe the offer without numbers and point to the CTA.');
  }
  if (c.socialProof.trim()) out.push('- Real social proof, to use exactly as written (light formatting only):\n' + c.socialProof.trim().split(/\r?\n/).map(function (x) { return '  > ' + x; }).join('\n'));
  else out.push('- Social proof: none supplied. Write no testimonials, reviews, customer counts or ratings. Omit the proof section or replace it with truthful trust elements such as the exact contents or the process.');

  /* 3 */
  H('3. Formula execution plan');
  const spec = plan.spec;
  out.push('Main framework: **' + formulaName(plan.primary) + '**' + (plan.auto ? ' (applied automatically)' : '') + '. ' + spec.purpose);
  if (plan.note) out.push(plan.note);
  out.push('');
  out.push('The formula must be observable: a reader should be able to find every stage in the finished copy. Do not print the formula name or the stage labels on the page. Stage by stage, with the section that carries it:');
  out.push('');
  plan.stages.forEach(function (st, i) {
    out.push((i + 1) + '. **' + st.key + '** (lives in the ' + st.sections.map(sectionNameOf).join(' + ') + (st.sections.length > 1 ? ' sections' : ' section') + '): ' + st.job);
  });
  out.push('');
  const shared = [];
  plan.stages.forEach(function (st) { if (st.sections.length === 1) { const n = plan.stages.filter(function (o) { return o.sections.length === 1 && o.sections[0] === st.sections[0]; }).length; if (n > 1 && shared.indexOf(st.sections[0]) === -1) shared.push(st.sections[0]); } });
  if (shared.length) out.push('Where several stages share one section (' + shared.map(sectionNameOf).join(', ') + '), give each stage its own paragraph or block in the order listed above.');
  out.push('Where a stage is carried by several sections, spread its argument across them without repeating it. Sections that are switched off are not recreated; their job is already assigned to the nearest enabled section above.');
  out.push('');
  out.push('- Headline strategy: ' + spec.headline);
  out.push('- Body copy strategy: ' + spec.body);
  out.push('- Transitions: ' + spec.transitions);
  out.push('- CTA strategy for this formula: ' + spec.cta);
  plan.secondary.forEach(function (s) {
    if (s.applied) out.push('- Supporting formula **' + formulaName(s.id) + '**: ' + s.text + ' Apply it only in ' + s.targets.map(sectionNameOf).join(', ') + ', and keep the main framework as the page backbone.');
    else out.push('- Supporting formula ' + formulaName(s.id) + ' was chosen but the sections it needs are switched off, so skip it. Do not add sections to make room for it.');
  });
  if (plan.lens4u) {
    const urg = hasUrgencySource(p);
    out.push('- **4U headline lens** (applies to the hero headline, subheadline, every section heading and the closing headline): each must be Useful, Unique and Ultra-specific. ' +
      (urg ? 'The brief mentions a time or quantity limit in the notes, so Urgent may be used, but only with exactly that fact.' : 'No real deadline or limit is in the brief, so skip urgency entirely.'));
    out.push('  ' + FORMULA_SPECS['4u'].headline);
  }
  if (plan.stages.some(function (s) { return s.key === 'Story'; })) {
    out.push('- Story rule: ' + (hasStoryFacts(p) ? 'Use only story facts that appear in the brand notes, social proof or additional notes below.' : 'No story facts were supplied. Write a brief, honest "why this exists" from the description only. Do not invent a personal story, origin, case study or testimonial.'));
  }
  out.push('- Never let the formula force a claim the brief does not support. If a stage cannot be written honestly from the facts, write a shorter, plainer version rather than inventing something.');

  /* 4 */
  H('4. Copywriting quality rules');
  const tone = c.tone === 'casual' ? 'Casual, warm and conversational.' : c.tone === 'formal' ? 'Formal, professional and concise.' :
    'Match the audience described above: warm and practical for parents and beginners, direct and efficient for professionals.';
  out.push('- Language: ' + lang + '. Tone: ' + tone + (b.language === 'id' ? ' Use natural, everyday Indonesian and one consistent way of addressing the reader (for example kamu or Anda). Avoid stiff translated phrasing.' : ''));
  out.push('- Be specific to this product and audience. Every sentence should be impossible to paste unchanged onto a different product.');
  out.push('- Prefer concrete benefits and details over abstract claims. Say what the reader can do, get or stop doing.');
  out.push('- State the value proposition in one plain sentence early, and show what differs from alternatives only when the brief gives you facts for it.');
  out.push('- Headline, subheadline, CTA and offer must support one another and tell the same story.');
  out.push('- Each section must add a new argument or fact. Do not repeat the same message in new words in another section.');
  out.push('- Clarity beats hype. Avoid generic phrases that fit any product, for example ' + GENERIC_PHRASES + '. They are not banned if a specific context truly justifies them, but never use them as defaults.');
  out.push('- Handle the doubts a reader of this product would likely have (who it is for, what exactly they get, how access or delivery works, how to pay, what to do if unsure) using only facts from this brief. Where a fact is missing write a clearly marked placeholder such as [to be confirmed]; never guess.');
  if (c.headline.trim()) out.push('- Headline idea from me: "' + c.headline.trim() + '". Keep its meaning and intent, but you may sharpen clarity and pull.');
  else out.push('- Hero headline: write several candidate headlines privately, score them for relevance, clarity, differentiation and pull, and keep the best one. It must state what this is and who it is for. Do not show the alternatives on the page.');
  out.push('- Never invent: testimonials, customer counts, ratings, prices, discounts, guarantees, certifications, results, scarcity, deadlines, bonuses or any business fact not stated here.');
  out.push('- Urgency or scarcity appears only when a real deadline or limit is stated in this brief.');
  line('Brand notes', c.brandNotes, 'None.');
  line('Additional notes from me', c.notes, 'None.');

  /* 5 */
  H('5. Style DNA: ' + style.name);
  if (d.mode === 'style') out.push('- Chosen by me from a preset gallery.');
  else if (d.mode === 'recommend') {
    const a = d.recommend;
    out.push('- Chosen from a short questionnaire (personality = ' + (labelOf(PERSONALITY, a.personality) || 'n/a') + '; impression = ' + (labelOf(EMOTION, a.emotion) || 'n/a') +
      '; price positioning = ' + (labelOf(PRICE, a.price) || 'n/a') + '; audience type = ' + (labelOf(AUDIENCE, a.audience) || 'n/a') + ').');
  } else {
    out.push('- I supplied a visual reference. Use "' + style.name + '" as the closest starting point and adapt it to what I like in the reference.');
    line('Reference URL', d.referenceUrl, 'None.');
    line('What I like about the reference', d.referenceNotes, 'Not described.');
    out.push('- Reference screenshot: ' + (d.referenceImageName ? 'I will attach it to this chat (' + d.referenceImageName + '). Study palette, type contrast, spacing, image treatment and composition.' : 'None attached.'));
    out.push('- Use the reference as guidance only. Do not copy its brand name, logo, text, photographs, illustrations or code. Capture the design language, not the assets.');
  }
  out.push('- Visual signature (the first thing a reviewer must see): ' + dna.sig);
  out.push('- Palette: background ' + style.palette.bg + ', surface ' + style.palette.surface + ', text ' + style.palette.ink + ', muted text ' + style.palette.muted + ', lines ' + style.palette.line + ', main accent ' + style.palette.accent + ', secondary accent ' + style.palette.accent2 + '.');
  out.push('- Colour roles: ' + dna.roles);
  if (hexes.length) out.push('- Brand colours I supplied: ' + hexes.join(', ') + '. They replace the accent colours above but not the roles or structure. Keep body text contrast at WCAG AA (4.5:1) or better.');
  else if (c.colors.trim()) out.push('- Brand colours I described: ' + c.colors.trim() + '. Turn them into suitable hex values for the accent roles and keep text contrast at WCAG AA or better.');
  else out.push('- Brand colours: none supplied. Use the palette above.');
  out.push('- Fonts: ' + style.fonts.display + ' for headings; ' + style.fonts.body + ' for body. System font stacks only, no web-font downloads.');
  out.push('- Typography: ' + dna.type);
  out.push('- Headline treatment: ' + dna.headline);
  out.push('- Surfaces, borders and shadows: ' + dna.surface);
  out.push('- Image treatment: ' + dna.image);
  out.push('- Spacing and whitespace: ' + dna.space);
  out.push('- Forbidden for this style: ' + dna.forbidden.join(', ') + '.');

  /* 6 */
  H('6. Section plan and order');
  out.push('Build exactly these sections, in this order. Each has one job that no other section repeats:');
  out.push('');
  enabled.forEach(function (s, i) {
    const tags = [];
    plan.stages.forEach(function (st) { if (st.sections.indexOf(s.id) !== -1) tags.push(formulaName(plan.primary) + ' ' + st.key); });
    plan.secondary.forEach(function (sc) { if (sc.applied && sc.targets.indexOf(s.id) !== -1) tags.push(formulaName(sc.id) + ' support'); });
    out.push((i + 1) + '. **' + s.name + '**: ' + (SECTION_JOB[s.id] || s.hint) + (tags.length ? ' Formula role: ' + tags.join('; ') + '.' : ''));
  });
  if (disabled.length) { out.push(''); out.push('Do not add these sections: ' + disabled.join(', ') + '.'); }
  out.push('Keep a clear path from hook to value, proof, offer and action.');

  /* 7 */
  H('7. Component design');
  out.push('Design each component to the Style DNA. Components differ by style; do not reuse one generic component set.');
  out.push('');
  out.push('- Primary button: ' + dna.button);
  out.push('- Secondary action: ' + dna.secondary + ' It must always have clearly less emphasis than the primary button. Use one primary CTA style and the same label throughout.');
  out.push('- Card or content container: ' + dna.card);
  out.push('- Pricing: ' + dna.pricing + (hasPrice ? '' : ' (No price was supplied, so show no price element.)'));
  out.push('- Badges and labels: ' + dna.badge + ' Use badges only for facts from the brief.');
  out.push('- Interaction states: ' + (lynk ? dna.states.lynk : dna.states.web));
  out.push('');
  out.push('Section composition (rhythm: ' + dna.rhythm + ')');
  out.push('');
  enabled.forEach(function (s) {
    const f = SECTION_DNA_FIELD[s.id] || 'text';
    out.push('- ' + s.name + ': ' + dna[f]);
  });
  out.push('');
  out.push('Vary composition from section to section in the way this style does. Do not turn every section into a card.');

  /* 8 */
  H('8. Platform constraints');
  if (lynk) {
    out.push('Target: ' + pageType + ' on Lynk.id.');
    out.push('');
    out.push('- Deliver complete HTML as ONE self-contained fragment starting with a single root <div>. No <html>, <head>, <body>, <script>, <style> or <link> tags.');
    out.push('- 100% inline CSS: every style goes in a style="" attribute. No <style> tag and no classes that depend on a stylesheet.');
    out.push('- Write literal values (for example hex colours) directly in each style attribute. No CSS custom properties.');
    out.push('- No external JavaScript, frameworks, web-font or CSS imports, or other external dependencies.');
    out.push('- Mobile-first. Root container: max-width ' + maxW + '; width: 100%; margin: 0 auto; box-sizing: border-box.');
    out.push('- No @keyframes, no marquee or scrolling-text animation, no pseudo-elements, no hover or media-query rules. If an animation cannot be done safely inline, leave it out.');
    out.push('- Do not use position: fixed or overflow tricks that could break the host page. Absolute positioning is fine only inside a wrapper with position: relative.');
    out.push('- For the FAQ use <details><summary>Question</summary><div>Answer</div></details> with all styling inline.');
    out.push('- Use only features that work in common mobile browsers. Keep the markup clean.');
    out.push('');
    out.push('Keeping the style inside these limits: the Style DNA still applies in full. Translate it as follows.');
    out.push('- Decorative shapes, stickers, numerals and markers are inline-block elements or spans, not pseudo-elements.');
    out.push('- Layout that would normally use media queries uses flex-wrap with flex: 1 1 <width>px children, max-width and clamp() so columns stack on phones.');
    out.push('- Hover and press effects are dropped; show static versions instead (for example a shadow that is already offset).');
    out.push('- Style-specific notes: ' + dna.lynk);
  } else {
    out.push('Target: a standard website I will host or open locally.');
    out.push('');
    out.push('- Deliver complete HTML and CSS' + (b.outputFormat === 'single' ? ' in ONE single HTML file with the CSS inside a <style> tag.' : ' as two files: index.html and styles.css, linked with <link rel="stylesheet" href="styles.css">.'));
    out.push('- Semantic HTML: header, main, section with headings in logical order, footer. One h1 only.');
    out.push('- Responsive, mobile-first layout with min-width media queries. No horizontal scrolling at any width.');
    out.push('- No frameworks, CSS libraries or build step. No JavaScript unless strictly needed (use <details> for the FAQ).');
    out.push('- Define the palette and spacing as CSS custom properties on :root so I can edit them. Pseudo-elements, hover states and transitions are allowed where the Style DNA calls for them.');
    out.push('- Include visible focus styles and respect prefers-reduced-motion.');
    out.push('- ' + (b.outputFormat === 'single' ? 'A single file is preferred so I can save and open it immediately.' : 'Keep the file structure to exactly those two files.'));
    out.push('- Style-specific notes: translate the Style DNA with normal CSS. Hover and focus states: ' + dna.states.web);
  }

  /* 9 */
  H('9. Asset and image requirements');
  if (c.productImageUrl.trim()) out.push('- Product image: use this URL in the hero or main visual with descriptive alt text: ' + c.productImageUrl.trim() + ' Treat it as the style prescribes (' + dna.image + ')');
  else out.push('- Product image: none supplied. Use a typography-led composition or simple inline shapes in the style. Do not insert unrelated stock photos or hotlink random images.');
  out.push('- Every image needs meaningful alt text, width: 100%, max-width: 100% and height: auto so it never overflows.');
  out.push('- Do not use logos, photos or illustrations that I have not provided.');
  if (d.mode === 'reference' && d.referenceImageName) out.push('- The reference screenshot is guidance only. Do not embed it in the page.');

  /* 10 */
  H('10. Responsive requirements');
  if (lynk) {
    out.push('- Design for 320px, 375px and 430px phone widths first, and check that it also sits well inside the ' + maxW + ' container on desktop.');
    out.push('- Use flexible widths (width: 100%, max-width) and flex-wrap. No fixed widths wider than the screen.');
  } else {
    out.push('- Start with a single-column mobile layout, then enhance at about 640px and 960px. Keep a comfortable reading width (about 65 characters) for body text.');
    out.push('- Think through 320px, 375px, 768px and 1280px.');
  }
  out.push('- The style must still be recognisable on a phone: keep its hero composition, button shape, borders and typography, only stacked.');
  out.push('- Buttons are at least 44px tall and easy to tap. Headlines scale down so they never overflow or collide. Keep text contrast at 4.5:1 or better.');

  /* 11 */
  H('11. Quality assurance');
  out.push('Before you answer, check every item silently and fix any failure. Do not claim you tested the page in a browser; you may say it was reviewed by reading the code.');
  out.push('');
  out.push('**Copywriting QA**');
  out.push('- [ ] Every stage of ' + formulaName(plan.primary) + ' (' + plan.stages.map(function (s) { return s.key; }).join(', ') + ') can be found in the copy, in order, in the sections named in section 3.');
  spec.validate.forEach(function (v) { out.push('- [ ] ' + v); });
  out.push('- [ ] The headline is specific to this product and audience, not a generic line.');
  out.push('- [ ] Each section adds a new argument; nothing is repeated in new words.');
  out.push('- [ ] Every feature is linked to a benefit for this audience.');
  out.push('- [ ] The offer is clear' + (hasPrice ? ' and uses the exact supplied prices' : ' and shows no invented price') + '.');
  out.push('- [ ] The CTA matches the goal and the label is the same everywhere.');
  out.push('- [ ] No claim, number, testimonial, guarantee or urgency appears that the brief does not support.');
  out.push('');
  out.push('**Design QA**');
  out.push('- [ ] The visual signature is obvious at a glance: ' + dna.sig);
  out.push('- [ ] The buttons, cards or containers, typography hierarchy and pricing follow section 7 and not a generic template.');
  out.push('- [ ] Section compositions vary the way the style prescribes; not every section is a card.');
  out.push('- [ ] None of these forbidden patterns appear: ' + dna.forbidden.join(', ') + '.');
  out.push('- [ ] None of the default patterns listed at the top (centered hero, rounded white cards, soft shadows, gradients, pill buttons, three-column grids, decorative icons) appear unless this Style DNA asks for them.');
  out.push('- [ ] The style stays consistent from the hero to the final CTA.');
  out.push('');
  out.push('**Technical QA**');
  out.push('- [ ] Only the sections listed in section 6 appear, in that order.');
  out.push(lynk ? '- [ ] One root <div>, 100% inline CSS, no <style>, <script> or <link>, no keyframes, no pseudo-elements, no CSS variables, width limit ' + maxW + ' applied.' :
    '- [ ] The HTML is valid and semantic, the file structure matches section 12, and there is no unnecessary JavaScript.');
  out.push('- [ ] No horizontal overflow at 320px and the CTAs are tappable.');
  out.push('- [ ] The FAQ and any requested interaction work without JavaScript.');

  /* 12 */
  H('12. Required output format');
  out.push('1. One short line naming the design direction you used.');
  if (lynk) out.push('2. The complete HTML in a single code block (language: html). Nothing outside the code block is part of the page.');
  else if (b.outputFormat === 'single') out.push('2. The complete single-file HTML in one code block (language: html).');
  else out.push('2. Two code blocks, each labeled with its filename: index.html and styles.css.');
  out.push('3. A short list of placeholders I must replace, such as links, prices or facts marked [to be confirmed].');
  out.push('4. These installation steps, in short form:');
  if (lynk) {
    if (b.lynkPageType === 'home') out.push('   Log in to Lynk.id and open your home page editor. Add a "Text" block and click the </> (HTML) button. Paste the whole HTML, save, and preview on a phone.');
    else out.push('   In Lynk.id open "Add Digital Product" (or edit an existing one). In the description area click the </> (HTML) button. Paste the whole HTML, save, and preview on a phone.');
  } else if (b.outputFormat === 'single') {
    out.push('   Save the code as index.html and double-click it to open in a browser. To publish, upload the file to any static host.');
  } else {
    out.push('   Save the two files in one folder as index.html and styles.css, then double-click index.html. To publish, upload the whole folder to any static host.');
  }
  out.push('Do not add long explanations before or after the code.');
  out.push('');
  out.push('Start now and follow section 12 exactly.');
  return out.join('\n');
}

/* =====================================================================
   7. UI
   ===================================================================== */

/* =====================================================================
   6b. GEMINI (optional)
   The user pastes their OWN Google AI Studio API key. It is kept in
   sessionStorage by default (gone when the tab closes), or in
   LocalStorage only if the user ticks "remember". It is never stored
   inside a project and is only sent to generativelanguage.googleapis.com.
   ===================================================================== */

function sessionGet(key) { try { return window.sessionStorage.getItem(key); } catch (e) { return null; } }
function sessionSet(key, val) { try { window.sessionStorage.setItem(key, val); return true; } catch (e) { return false; } }
function sessionRemove(key) { try { window.sessionStorage.removeItem(key); } catch (e) { /* ignore */ } }

function loadGemini() {
  const g = state.gemini;
  const raw = storageGet(KEYS.gemini);
  if (raw) {
    try { const o = JSON.parse(raw); if (o && typeof o.key === 'string' && o.key) { g.key = o.key; g.remember = true; return; } } catch (e) { /* fall through */ }
  }
  const s = sessionGet(GEMINI_SESSION_KEY);
  if (s) g.key = s;
}
function saveGemini() {
  const g = state.gemini;
  if (g.key && g.remember) {
    if (!storageSet(KEYS.gemini, JSON.stringify({ key: g.key }))) {
      g.remember = false; sessionSet(GEMINI_SESSION_KEY, g.key);
      setKeyStatus('Could not save the key in this browser. It is kept for this tab only.', 'error');
    } else sessionRemove(GEMINI_SESSION_KEY);
  } else {
    storageRemove(KEYS.gemini);
    if (g.key) sessionSet(GEMINI_SESSION_KEY, g.key); else sessionRemove(GEMINI_SESSION_KEY);
  }
}
function wipeGemini() {
  const g = state.gemini;
  g.key = ''; g.remember = false; g.models = []; g.status = { msg: '', kind: 'info' };
  storageRemove(KEYS.gemini); sessionRemove(GEMINI_SESSION_KEY);
}

/* ---- network ---- */
function geminiError(status, data) {
  const raw = data && data.error && data.error.message ? String(data.error.message) : '';
  let msg;
  if (status === 400 && /api key/i.test(raw)) msg = 'Google says the API key is not valid. Copy it again from Google AI Studio.';
  else if (status === 400) msg = 'Google rejected the request: ' + clip(raw, 220);
  else if (status === 401 || status === 403) {
    msg = /leak/i.test(raw) ? 'Google disabled this key because it was reported as leaked. Create a new key in Google AI Studio.'
      : 'Google refused this key. Check that it is active, that the Gemini API is allowed for it, and that your region is supported.';
  }
  else if (status === 404) msg = 'That model is not available for this key. Choose another model.';
  else if (status === 429) msg = 'Quota or rate limit reached. Wait a minute, or choose a lighter Flash model. Free-tier limits are small.';
  else if (status >= 500) msg = 'Gemini is overloaded or temporarily unavailable. Try again in a moment.';
  else msg = 'Gemini returned an error (' + status + '). ' + clip(raw, 220);
  const err = new Error(msg); err.status = status; return err;
}

async function geminiRequest(url, init, key, signal) {
  let res;
  try {
    res = await fetch(url, Object.assign({}, init, { headers: Object.assign({ 'x-goog-api-key': key }, init.headers || {}), signal: signal }));
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new Error('Could not reach Google. Check your internet connection or any ad blocker, then try again.');
  }
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) throw geminiError(res.status, data);
  return data || {};
}

async function listGeminiModels(key, signal) {
  const ids = []; let token = '', pages = 0;
  do {
    const url = GEMINI_BASE + 'models?pageSize=100' + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    const data = await geminiRequest(url, { method: 'GET' }, key, signal);
    (data.models || []).forEach(function (m) {
      if ((m.supportedGenerationMethods || []).indexOf('generateContent') === -1) return;
      const id = String(m.name || '').replace(/^models\//, '');
      if (!/^gemini-/.test(id)) return;
      if (/embedding|tts|image|live|audio|robotics|computer-use|native|imagen|veo/.test(id)) return;
      if (ids.indexOf(id) === -1) ids.push(id);
    });
    token = data.nextPageToken || ''; pages++;
  } while (token && pages < 5);
  ids.sort(function (a, b) {
    const la = /-latest$/.test(a), lb = /-latest$/.test(b);
    if (la !== lb) return la ? -1 : 1;
    return a < b ? 1 : a > b ? -1 : 0;
  });
  return ids;
}

async function callGemini(prompt, model, signal) {
  const url = GEMINI_BASE + 'models/' + encodeURIComponent(model) + ':generateContent';
  const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const data = await geminiRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body }, state.gemini.key, signal);
  if (data.promptFeedback && data.promptFeedback.blockReason) {
    throw new Error('Gemini blocked this prompt (' + data.promptFeedback.blockReason + '). Edit the prompt and try again.');
  }
  const cand = (data.candidates || [])[0];
  const parts = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
  const text = parts.filter(function (x) { return x && typeof x.text === 'string' && !x.thought; }).map(function (x) { return x.text; }).join('');
  if (!text.trim()) throw new Error('Gemini returned an empty answer' + (cand && cand.finishReason ? ' (' + cand.finishReason + ')' : '') + '. Try again or choose another model.');
  return { text: text, finish: (cand && cand.finishReason) || '' };
}

/* ---- reading the answer ---- */
function extractBlocks(text) {
  const blocks = []; const re = /```([A-Za-z0-9]*)[^\n]*\n([\s\S]*?)```/g; let m;
  while ((m = re.exec(text))) blocks.push({ lang: m[1].toLowerCase(), code: m[2].replace(/\s+$/, '') });
  if (!blocks.length) {
    const open = text.match(/```([A-Za-z0-9]*)[^\n]*\n([\s\S]*)$/); // answer cut off before the closing fence
    if (open) blocks.push({ lang: open[1].toLowerCase(), code: open[2].replace(/\s+$/, '') });
  }
  return blocks;
}
/* Returns { raw, doc } or null. raw = the HTML as written; doc = a complete page for preview/download. */
function extractPage(text, lynk) {
  const blocks = extractBlocks(text);
  const html = blocks.filter(function (b) { return b.lang === 'html' || b.lang === 'htm'; })[0] || blocks.filter(function (b) { return /<[a-z][\s\S]*>/i.test(b.code) && b.lang !== 'css'; })[0];
  if (!html || !html.code.trim()) return null;
  const css = blocks.filter(function (b) { return b.lang === 'css'; }).map(function (b) { return b.code; }).join('\n');
  let doc = html.code;
  if (css && !lynk) {
    const tag = '<style>\n' + css + '\n</style>';
    doc = doc.replace(/<link[^>]+styles\.css[^>]*>/i, '');
    doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, tag + '\n</head>') : tag + '\n' + doc;
  }
  if (!/<html[\s>]/i.test(doc)) {
    doc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;background:#fff}</style></head><body>' + doc + '</body></html>';
  }
  return { raw: html.code, doc: doc, mergedCss: !!css && !lynk };
}

/* ---- key panel (built twice: Settings and Step 6) ---- */
const keyPanels = [];

function setKeyStatus(msg, kind) {
  state.gemini.status = { msg: msg || '', kind: kind || 'info' };
  keyPanels.forEach(function (p) { p.status.textContent = state.gemini.status.msg; p.status.className = 'status status-' + state.gemini.status.kind; });
}
function syncKeyPanels() {
  keyPanels.forEach(function (p) {
    const g = state.gemini;
    if (document.activeElement !== p.keyInput) p.keyInput.value = g.key;
    p.remember.checked = g.remember;
    const current = state.settings.geminiModel;
    const ids = (g.models.length ? g.models : GEMINI_DEFAULT_MODELS).slice();
    if (ids.indexOf(current) === -1) ids.unshift(current);
    p.modelSel.textContent = '';
    ids.forEach(function (id) { p.modelSel.append(el('option', { value: id }, id + (/-latest$/.test(id) ? ' (follows the newest version)' : ''))); });
    p.modelSel.value = current;
    p.status.textContent = g.status.msg; p.status.className = 'status status-' + g.status.kind;
  });
  updateGenUI();
}

async function testGeminiKey() {
  const g = state.gemini;
  if (!g.key) { setKeyStatus('Paste your API key first.', 'error'); return; }
  if (g.busy) return;
  g.busy = true; setKeyStatus('Checking your key with Google…', 'info');
  try {
    const ids = await listGeminiModels(g.key);
    g.models = ids;
    if (!ids.length) setKeyStatus('The key works, but no Gemini text models were listed for it.', 'error');
    else if (ids.indexOf(state.settings.geminiModel) === -1) {
      state.settings.geminiModel = ids[0]; saveSettings();
      setKeyStatus('Key works. ' + ids.length + ' models available. Your previous model was not available, so ' + ids[0] + ' was selected.', 'ok');
    } else setKeyStatus('Key works. ' + ids.length + ' models available for this key.', 'ok');
  } catch (e) { setKeyStatus(e.message, 'error'); }
  g.busy = false; syncKeyPanels();
}

function buildKeyPanel(prefix) {
  const g = state.gemini;
  const keyInput = el('input', { type: 'password', id: prefix + '-key', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', placeholder: 'Paste your Gemini API key' });
  const showBtn = el('button', { type: 'button', class: 'btn btn-small', 'aria-pressed': 'false' }, 'Show');
  const remember = el('input', { type: 'checkbox', id: prefix + '-remember' });
  const modelSel = el('select', { id: prefix + '-model' });
  const testBtn = el('button', { type: 'button', class: 'btn btn-small' }, 'Test key and load models');
  const removeBtn = el('button', { type: 'button', class: 'btn btn-small btn-quiet btn-danger-text' }, 'Remove key');
  const status = el('p', { class: 'status', role: 'status', 'aria-live': 'polite' });

  keyInput.addEventListener('input', function () {
    g.key = keyInput.value.trim(); g.models = []; saveGemini(); setKeyStatus('', 'info'); syncKeyPanels();
  });
  showBtn.addEventListener('click', function () {
    const show = keyInput.type === 'password';
    keyPanels.forEach(function (p) { p.keyInput.type = show ? 'text' : 'password'; p.showBtn.textContent = show ? 'Hide' : 'Show'; p.showBtn.setAttribute('aria-pressed', String(show)); });
  });
  remember.addEventListener('change', function () {
    g.remember = remember.checked; saveGemini();
    if (g.key) setKeyStatus(g.remember ? 'The key will stay in this browser until you remove it.' : 'The key is now kept for this tab only.', 'info');
    syncKeyPanels();
  });
  modelSel.addEventListener('change', function () { state.settings.geminiModel = modelSel.value; saveSettings(); syncKeyPanels(); });
  testBtn.addEventListener('click', testGeminiKey);
  removeBtn.addEventListener('click', function () {
    wipeGemini(); setKeyStatus('The key was removed from this browser.', 'ok'); syncKeyPanels();
  });

  const root = el('div', { class: 'gkey' },
    el('div', { class: 'field' },
      el('label', { for: prefix + '-key' }, 'Your Google AI Studio API key'),
      el('div', { class: 'gkey-row' }, keyInput, showBtn),
      el('p', { class: 'hint' }, el('a', { href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener noreferrer' }, 'Get a free key in Google AI Studio'), ' (opens in a new tab).')),
    el('label', { class: 'gkey-check', for: prefix + '-remember' }, remember, el('span', null, 'Remember this key in this browser', el('br'), el('small', { class: 'gkey-note' }, 'Off by default: the key then disappears when you close the tab. Do not turn this on for a shared computer.'))),
    el('div', { class: 'field' }, el('label', { for: prefix + '-model' }, 'Model'), modelSel),
    el('div', { class: 'btn-row' }, testBtn, removeBtn),
    status,
    el('p', { class: 'gkey-note' }, 'The key is stored only in this browser and sent only to Google (generativelanguage.googleapis.com), never to any other server. Anyone who can use this browser profile can read it. Free-tier requests may be used by Google to improve its products, so do not send private client data on a free key.'));

  keyPanels.push({ root: root, keyInput: keyInput, showBtn: showBtn, remember: remember, modelSel: modelSel, status: status });
  syncKeyPanels();
  return root;
}

/* ---- Step 6: generate with Gemini ---- */
function setGenStatus(msg, kind) { const n = $('#gen-status'); n.textContent = msg; n.className = 'status status-' + (kind || 'info'); }

function updateGenUI() {
  const btn = $('#btn-gen'); if (!btn) return;
  const g = state.gemini;
  btn.disabled = g.genBusy === true;
  $('#btn-gen-cancel').hidden = g.genBusy !== true;
  const det = $('#gkey-details');
  if (det && !g.key && !det.dataset.touched) det.open = true;
  const n = $('#gen-model-note');
  if (n) n.textContent = g.key ? 'Model: ' + state.settings.geminiModel : 'Add your API key below to enable this.';
}

async function runGemini() {
  const g = state.gemini, p = state.current;
  if (!p || g.genBusy) return;
  const prompt = $('#prompt-text').value.trim();
  if (!prompt) { setGenStatus('The prompt is empty. Regenerate it first.', 'error'); return; }
  if (!g.key) {
    setGenStatus('Add your Gemini API key first.', 'error');
    const det = $('#gkey-details'); det.open = true;
    const k = $('#gp-key'); if (k) k.focus();
    return;
  }
  const model = state.settings.geminiModel;
  const controller = new AbortController(); let timedOut = false;
  const timer = setTimeout(function () { timedOut = true; controller.abort(); }, 240000);
  g.genBusy = true; g.controller = controller; updateGenUI();
  setGenStatus('Asking Gemini (' + model + '). This can take up to a minute…', 'info');
  try {
    const r = await callGemini(prompt, model, controller.signal);
    state.gen = { projectId: p.id, text: r.text, model: model, finish: r.finish };
    renderGenResult();
    setGenStatus('Done. Check the preview below before you use the code.', 'ok');
  } catch (e) {
    if (e && e.name === 'AbortError') setGenStatus(timedOut ? 'Gemini took too long, so the request was stopped. Try again or choose a Flash model.' : 'Cancelled.', timedOut ? 'error' : 'info');
    else setGenStatus(e.message, 'error');
  }
  clearTimeout(timer); g.genBusy = false; g.controller = null; updateGenUI();
}

function renderGenResult() {
  const r = state.gen, box = $('#gen-result');
  if (!r || !state.current || r.projectId !== state.current.id) { box.hidden = true; return; }
  const lynk = state.current.brief.platform === 'lynk';
  const page = extractPage(r.text, lynk);
  state.genPage = page;
  box.hidden = false;
  $('#gen-out').value = r.text;
  $('#gen-copy').disabled = !page; $('#gen-download').disabled = !page;
  let note;
  if (page) note = 'Made by ' + r.model + '. The preview runs without scripts for safety, so animations that need JavaScript will not move here.' + (page.mergedCss ? ' The CSS was merged into one HTML file.' : '');
  else note = 'No HTML code block was found in the answer. Read the full response below, or generate again.';
  if (r.finish === 'MAX_TOKENS') note += ' The answer was cut off at the length limit, so the code may be incomplete.';
  $('#gen-note').textContent = note;
  const wrap = $('#gen-frame-wrap'); wrap.textContent = ''; wrap.dataset.vp = state.genViewport;
  if (page) wrap.append(el('iframe', { class: 'gen-iframe', sandbox: '', title: 'Preview of the generated landing page', srcdoc: page.doc }));
  $$('.gseg-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.gvp === state.genViewport)); });
}

async function copyText(text) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* fall back */ }
  const ta = el('textarea', { style: 'position:fixed;left:-999px;top:0', 'aria-hidden': 'true' }); ta.value = text; document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove(); return ok;
}
function genOutputText() {
  const pg = state.genPage; if (!pg) return '';
  return state.current && state.current.brief.platform === 'lynk' ? pg.raw : pg.doc;
}
function copyGenCode() {
  const t = genOutputText(); if (!t) return;
  copyText(t).then(function (ok) { setGenStatus(ok ? 'HTML copied (' + t.length + ' characters).' : 'Could not copy automatically. Open "Full response" and copy from there.', ok ? 'ok' : 'error'); });
}
function downloadGenCode() {
  const t = genOutputText(); if (!t) return;
  const p = state.current;
  const name = String(p.name || p.brief.productName || 'landing-page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'landing-page';
  const url = URL.createObjectURL(new Blob([t], { type: 'text/html;charset=utf-8' }));
  const a = el('a', { href: url, download: name + '.html' }); document.body.append(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  setGenStatus('Downloaded ' + name + '.html.', 'ok');
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
  syncKeyPanels();
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
  syncAiMode();
}

/* ---------- AI mode (Step 1): with AI (Gemini, own key) or without AI (prompt only) ---------- */
function syncAiMode() {
  const p = state.current; if (!p) return;
  $$('input[name="aiMode"]').forEach(function (r) { r.checked = r.value === p.aiMode; });
  const blk = $('#ai-key-block'); if (blk) blk.hidden = p.aiMode !== 'gemini';
}
function setAiMode(mode) {
  const p = state.current; if (!p || (mode !== 'none' && mode !== 'gemini')) return;
  p.aiMode = mode; syncAiMode(); applyAiModeToStep6(); scheduleSave();
}
function applyAiModeToStep6() {
  const p = state.current; if (!p) return;
  const on = p.aiMode === 'gemini';
  const gen = $('.gen'); if (gen) gen.hidden = !on;
  const off = $('#ai-off-note'); if (off) off.hidden = on;
  const copy = $('#btn-copy'); if (copy) copy.className = 'btn' + (on ? '' : ' btn-primary');
  const h = $('#h-step-6-sub');
  if (h) h.textContent = on ? 'With AI is on: generate the page with your own Gemini key below, or copy the prompt to use anywhere else.' : 'Built from your current project data. Edit anything, then copy it into Claude, ChatGPT or any other AI.';
  if (on) { const det = $('#gkey-details'); if (det && !state.gemini.key) det.open = true; }
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
function formulaSummary(p) {
  const plan = resolveFormulaPlan(p);
  let t = formulaName(plan.primary) + (plan.auto ? ' (automatic)' : ' (main)');
  plan.secondary.forEach(function (s) { t += ', ' + formulaName(s.id) + (s.applied ? ' (support)' : ' (skipped, sections off)'); });
  if (plan.lens4u) t += ', 4U (headlines)';
  return t;
}
function formulaPlanText(p) {
  return resolveFormulaPlan(p).stages.map(function (st) { return st.key + ' → ' + st.sections.map(sectionNameOf).join(' + '); }).join('; ');
}

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
    ['Copy formula', formulaSummary(p)],
    ['Formula plan', formulaPlanText(p)],
    ['AI mode', p.aiMode === 'gemini' ? 'With AI (Gemini, your own key)' : 'Without AI (prompt only)'],
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
  setGenStatus('', 'info'); applyAiModeToStep6(); syncKeyPanels(); renderGenResult();
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
    openDialog({ title: 'Clear all local data?', message: 'This removes every saved project, your settings and any saved API key from this browser. It cannot be undone.', okText: 'Clear everything', danger: true }).then(function (yes) {
      if (!yes) return;
      storageRemove(KEYS.projects); storageRemove(KEYS.settings); storageRemove('lpps.projects.v1.damaged');
      wipeGemini(); state.gen = null; state.genPage = null;
      state.projects = []; state.current = null; state.dirty = false; state.settings = { platform: 'lynk', language: 'id', geminiModel: 'gemini-flash-latest' };
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

  // AI mode (Step 1)
  $$('input[name="aiMode"]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) setAiMode(r.value); }); });
  $('#btn-ai-on').addEventListener('click', function () { setAiMode('gemini'); showStep(1); const k = $('#gb-key'); if (k) k.focus(); });

  // Gemini
  $('#gkey-mount-brief').append(buildKeyPanel('gb'));
  $('#gkey-mount-settings').append(buildKeyPanel('gs'));
  $('#gkey-mount-studio').append(buildKeyPanel('gp'));
  $('#gkey-details').addEventListener('toggle', function (e) { e.target.dataset.touched = '1'; });
  $('#btn-gen').addEventListener('click', runGemini);
  $('#btn-gen-cancel').addEventListener('click', function () { if (state.gemini.controller) state.gemini.controller.abort(); });
  $('#gen-copy').addEventListener('click', copyGenCode);
  $('#gen-download').addEventListener('click', downloadGenCode);
  $$('.gseg-btn').forEach(function (b) { b.addEventListener('click', function () { state.genViewport = b.dataset.gvp; renderGenResult(); }); });

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
  loadGemini();
  loadProjects();
  populateSelects();
  bindEvents();
  showView('dashboard', false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
