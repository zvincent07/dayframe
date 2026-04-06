
type NutritionBase = {
  p: number; // protein
  c: number; // carbs
  f: number; // fats
  k: number; // calories
  unit: "g" | "ml" | "pc"; // base unit: grams, milliliters, or piece
  def?: number; // default quantity if none specified (e.g. 100g for meats, 1pc for eggs)
  gPerPc?: number; // approximate grams per piece for pc-based items
};

const DB: Record<string, NutritionBase> = {
  // Meats & Fish (per 100g raw/cooked approx)
  chicken: { p: 31, c: 0, f: 3.6, k: 165, unit: "g", def: 100 },
  breast: { p: 31, c: 0, f: 3.6, k: 165, unit: "g", def: 100 },
  beef: { p: 26, c: 0, f: 15, k: 250, unit: "g", def: 100 },
  steak: { p: 25, c: 0, f: 19, k: 271, unit: "g", def: 100 },
  pork: { p: 27, c: 0, f: 14, k: 242, unit: "g", def: 100 },
  "char siu": { p: 27, c: 0, f: 14, k: 242, unit: "g", def: 100 },
  charsiu: { p: 27, c: 0, f: 14, k: 242, unit: "g", def: 100 },
  "barbecue pork": { p: 27, c: 0, f: 14, k: 242, unit: "g", def: 100 },
  "bbq pork": { p: 27, c: 0, f: 14, k: 242, unit: "g", def: 100 },
  "roast pork": { p: 27, c: 0, f: 14, k: 242, unit: "g", def: 100 },
  drumstick: { p: 27, c: 0, f: 11, k: 215, unit: "g", def: 100 },
  "fried chicken": { p: 19, c: 8, f: 16, k: 250, unit: "g", def: 100 },
  fish: { p: 22, c: 0, f: 12, k: 206, unit: "g", def: 100 },
  salmon: { p: 20, c: 0, f: 13, k: 208, unit: "g", def: 100 },
  tuna: { p: 28, c: 0, f: 1, k: 130, unit: "g", def: 100 }, // Canned, drained
  century: { p: 28, c: 0, f: 1, k: 130, unit: "g", def: 100 }, // "Century Tuna" alias
  shrimp: { p: 24, c: 0.2, f: 0.3, k: 99, unit: "g", def: 100 },

  // Dairy & Egg
  egg: { p: 6, c: 0.6, f: 5, k: 78, unit: "pc", def: 1, gPerPc: 50 },
  eggs: { p: 6, c: 0.6, f: 5, k: 78, unit: "pc", def: 1, gPerPc: 50 },
  white: { p: 3.6, c: 0.2, f: 0, k: 17, unit: "pc", def: 1, gPerPc: 33 },
  milk: { p: 3.4, c: 5, f: 1, k: 42, unit: "ml", def: 200 }, // per 100ml
  yogurt: { p: 10, c: 3.6, f: 0.4, k: 59, unit: "g", def: 150 }, // Greek yogurt approx
  cheese: { p: 25, c: 1.3, f: 33, k: 402, unit: "g", def: 30 },
  whey: { p: 75, c: 5, f: 5, k: 380, unit: "g", def: 30 }, // Powder per 100g (approx 22.5g p per 30g scoop)

  // Grains & Carbs
  rice: { p: 2.7, c: 28, f: 0.3, k: 130, unit: "g", def: 150 }, // Cooked white rice
  oats: { p: 13, c: 68, f: 6, k: 379, unit: "g", def: 50 }, // Raw oats
  bread: { p: 3, c: 15, f: 1, k: 80, unit: "pc", def: 1, gPerPc: 25 }, // 1 slice
  loaf: { p: 3, c: 15, f: 1, k: 80, unit: "pc", def: 1, gPerPc: 25 }, // alias for bread
  slice: { p: 3, c: 15, f: 1, k: 80, unit: "pc", def: 1, gPerPc: 25 }, // alias
  toast: { p: 3, c: 15, f: 1, k: 80, unit: "pc", def: 1, gPerPc: 25 },
  pasta: { p: 5, c: 25, f: 1, k: 131, unit: "g", def: 150 }, // Cooked
  potato: { p: 2, c: 17, f: 0.1, k: 77, unit: "g", def: 150 }, // Boiled
  sweet: { p: 1.6, c: 20, f: 0.1, k: 86, unit: "g", def: 150 }, // Sweet potato

  // Fruits & Veg
  banana: { p: 1.3, c: 27, f: 0.3, k: 105, unit: "pc", def: 1, gPerPc: 118 },
  apple: { p: 0.5, c: 25, f: 0.3, k: 95, unit: "pc", def: 1, gPerPc: 182 },
  orange: { p: 0.9, c: 12, f: 0.1, k: 47, unit: "pc", def: 1, gPerPc: 131 },
  broccoli: { p: 2.8, c: 7, f: 0.4, k: 34, unit: "g", def: 100 },
  veggies: { p: 2, c: 5, f: 0.2, k: 30, unit: "g", def: 100 }, // Generic mix

  // Fats & Nuts
  peanut: { p: 26, c: 16, f: 49, k: 567, unit: "g", def: 30 },
  nuts: { p: 20, c: 20, f: 50, k: 600, unit: "g", def: 30 },
  almond: { p: 21, c: 22, f: 50, k: 579, unit: "g", def: 30 },
  butter: { p: 0.8, c: 0.1, f: 81, k: 717, unit: "g", def: 10 }, // Peanut butter is separate?
  peanutbutter: { p: 25, c: 20, f: 50, k: 588, unit: "g", def: 15 },
  oil: { p: 0, c: 0, f: 100, k: 884, unit: "ml", def: 15 },
  avocado: { p: 2, c: 9, f: 15, k: 160, unit: "pc", def: 1 },

  sauce: { p: 2, c: 6, f: 3, k: 60, unit: "g", def: 30 },
  "tomato sauce": { p: 2, c: 7, f: 2, k: 40, unit: "g", def: 60 },
  "meat sauce": { p: 8, c: 8, f: 10, k: 150, unit: "g", def: 100 },
  "red meat sauce": { p: 8, c: 8, f: 10, k: 150, unit: "g", def: 100 },

  // Snacks & Misc
  gum: { p: 0, c: 2, f: 0, k: 5, unit: "pc", def: 1 }, // Sugar-free gum approx
  chocolate: { p: 5, c: 60, f: 30, k: 546, unit: "g", def: 30 },
  chip: { p: 7, c: 53, f: 35, k: 536, unit: "g", def: 30 }, // chips
  chips: { p: 7, c: 53, f: 35, k: 536, unit: "g", def: 30 },
  cookie: { p: 5, c: 65, f: 25, k: 502, unit: "g", def: 20 },
  bar: { p: 20, c: 25, f: 8, k: 250, unit: "pc", def: 1, gPerPc: 60 }, // Protein bar approx
  cloud: { p: 3, c: 20, f: 8, k: 160, unit: "pc", def: 1 }, // Cloud 9 approx
  piattos: { p: 2, c: 18, f: 9, k: 160, unit: "pc", def: 1 }, // Small pack
  nova: { p: 2, c: 18, f: 8, k: 150, unit: "pc", def: 1 }, // Small pack
  clover: { p: 1, c: 15, f: 6, k: 120, unit: "pc", def: 1 }, // Small pack
  chippy: { p: 2, c: 16, f: 10, k: 160, unit: "pc", def: 1 }, // Small pack
  vcut: { p: 2, c: 17, f: 9, k: 160, unit: "pc", def: 1 }, // Small pack
  stick: { p: 1, c: 15, f: 5, k: 110, unit: "pc", def: 1 }, // Bread stick / Stick-o (approx)
  fita: { p: 3, c: 20, f: 7, k: 150, unit: "pc", def: 1 }, // Crackers
  skyflakes: { p: 3, c: 18, f: 5, k: 130, unit: "pc", def: 1 }, // Crackers
  oreo: { p: 1, c: 8, f: 3, k: 53, unit: "pc", def: 1 }, // 1 cookie
  presto: { p: 2, c: 20, f: 8, k: 160, unit: "pc", def: 1 }, // Creams
  rebisco: { p: 3, c: 20, f: 6, k: 140, unit: "pc", def: 1 }, // Crackers
  magic: { p: 2, c: 18, f: 5, k: 130, unit: "pc", def: 1 }, // Magic flakes

  // Meals & Dishes (Filipino/International)
  // Approximations per "serving" (usually 1 cup or small bowl ~200-250g)
  afritada: { p: 20, c: 15, f: 18, k: 300, unit: "pc", def: 1 }, // Chicken/Pork stew
  adobo: { p: 25, c: 5, f: 20, k: 300, unit: "pc", def: 1 }, // Pork/Chicken Adobo
  sinigang: { p: 20, c: 8, f: 15, k: 250, unit: "pc", def: 1 }, // Sour soup
  nilaga: { p: 25, c: 10, f: 15, k: 280, unit: "pc", def: 1 }, // Beef soup
  tinola: { p: 25, c: 5, f: 10, k: 220, unit: "pc", def: 1 }, // Chicken soup
  lechon: { p: 20, c: 0, f: 25, k: 350, unit: "g", def: 100 }, // Roast pork (fatty)
  sisig: { p: 20, c: 2, f: 30, k: 350, unit: "g", def: 100 }, // Sizzling pork
  pancit: { p: 10, c: 40, f: 10, k: 300, unit: "pc", def: 1 }, // Noodles
  lumpia: { p: 5, c: 10, f: 8, k: 130, unit: "pc", def: 1 }, // Spring roll (per piece)
  spaghetti: { p: 5, c: 31, f: 1.5, k: 158, unit: "g", def: 180 },
  burger: { p: 20, c: 30, f: 20, k: 400, unit: "pc", def: 1 }, // Standard burger
  fries: { p: 3, c: 40, f: 15, k: 300, unit: "g", def: 100 },
  pizza: { p: 12, c: 30, f: 12, k: 280, unit: "pc", def: 1, gPerPc: 110 }, // 1 slice
  // Global / International Cuisines
  // Italian
  lasagna: { p: 15, c: 35, f: 12, k: 300, unit: "pc", def: 1 }, // 1 square
  carbonara: { p: 15, c: 45, f: 20, k: 420, unit: "pc", def: 1 }, // 1 plate
  pesto: { p: 12, c: 45, f: 25, k: 450, unit: "pc", def: 1 }, // 1 plate
  ravioli: { p: 10, c: 30, f: 10, k: 250, unit: "pc", def: 1 }, // 1 serving

  // Mexican
  taco: { p: 10, c: 20, f: 10, k: 210, unit: "pc", def: 1 }, // 1 taco
  burrito: { p: 20, c: 50, f: 18, k: 450, unit: "pc", def: 1 },
  quesadilla: { p: 15, c: 30, f: 20, k: 360, unit: "pc", def: 1 },
  nachos: { p: 6, c: 40, f: 25, k: 400, unit: "pc", def: 1 }, // 1 plate

  // Japanese
  sushi: { p: 3, c: 10, f: 0.5, k: 50, unit: "pc", def: 1 }, // 1 roll piece
  sashimi: { p: 6, c: 0, f: 2, k: 40, unit: "pc", def: 1 }, // 1 slice
  ramen: { p: 15, c: 55, f: 15, k: 450, unit: "pc", def: 1 }, // 1 bowl
  tempura: { p: 4, c: 10, f: 8, k: 120, unit: "pc", def: 1 }, // 1 pc shrimp
  gyudon: { p: 20, c: 60, f: 15, k: 500, unit: "pc", def: 1 }, // Beef bowl
  teriyaki: { p: 25, c: 15, f: 10, k: 250, unit: "pc", def: 1 }, // Chicken dish

  // Chinese
  dimsum: { p: 4, c: 5, f: 3, k: 70, unit: "pc", def: 1 }, // 1 pc siomai/dumpling
  siomai: { p: 4, c: 5, f: 3, k: 70, unit: "pc", def: 1 },
  dumpling: { p: 4, c: 6, f: 3, k: 70, unit: "pc", def: 1 },
  bao: { p: 6, c: 30, f: 5, k: 200, unit: "pc", def: 1 }, // 1 siopao
  friedrice: { p: 8, c: 45, f: 10, k: 300, unit: "pc", def: 1 }, // 1 cup/bowl
  chowmein: { p: 10, c: 40, f: 12, k: 350, unit: "pc", def: 1 }, // Noodles

  // Indian
  curry: { p: 15, c: 10, f: 20, k: 300, unit: "pc", def: 1 }, // 1 bowl chicken/veg
  naan: { p: 8, c: 45, f: 8, k: 280, unit: "pc", def: 1 }, // 1 piece
  biryani: { p: 15, c: 60, f: 15, k: 450, unit: "pc", def: 1 }, // 1 plate
  tikka: { p: 25, c: 5, f: 12, k: 250, unit: "pc", def: 1 },

  // American / Western
  hotdog: { p: 8, c: 20, f: 15, k: 250, unit: "pc", def: 1 },
  sandwich: { p: 15, c: 35, f: 12, k: 320, unit: "pc", def: 1 }, // Generic
  wrap: { p: 18, c: 35, f: 12, k: 350, unit: "pc", def: 1 }, // Chicken wrap
  pancake: { p: 4, c: 20, f: 5, k: 140, unit: "pc", def: 1 }, // 1 pc
  waffle: { p: 4, c: 25, f: 8, k: 180, unit: "pc", def: 1 },

  // Generic Staples
  salad: { p: 5, c: 10, f: 15, k: 200, unit: "pc", def: 1 }, // Mixed green w/ dressing
  soup: { p: 8, c: 15, f: 5, k: 150, unit: "pc", def: 1 }, // Generic bowl
  stew: { p: 20, c: 15, f: 10, k: 250, unit: "pc", def: 1 }, // Generic beef/pork stew
  fry: { p: 15, c: 15, f: 15, k: 250, unit: "pc", def: 1 }, // Stir fry serving
  noodle: { p: 8, c: 45, f: 5, k: 280, unit: "pc", def: 1 }, // Generic noodle dish
};

function parseQuantity(text: string): { amount: number; unit: string | null } {
  // Matches: 100g, 100 g, 1.5kg, 100, 2 slices, 2 pcs, 1 cup, 1/2 cup
  // Handle fractions like "1/2"
  const fractionMatch = text.match(/^(\d+)\/(\d+)\s*([a-zA-Z]+)?/);
  if (fractionMatch) {
    return {
      amount: parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2]),
      unit: fractionMatch[3] ? fractionMatch[3].toLowerCase() : null,
    };
  }

  const match = text.match(/^([\d.]+)\s*([a-zA-Z]+)?/);
  if (!match) return { amount: 1, unit: null };
  return {
    amount: parseFloat(match[1]),
    unit: match[2] ? match[2].toLowerCase() : null,
  };
}

function getMultiplier(amount: number, unit: string | null, baseUnit: "g" | "ml" | "pc", defaultDef: number, gPerPc?: number): number {
  if (baseUnit === "pc") {
    if (!unit) return amount;
    if (unit === "pc" || unit === "pcs" || unit === "slice" || unit === "slices" || unit === "piece" || unit === "pieces" || unit === "egg" || unit === "eggs") return amount;
    let grams = 0;
    if (unit === "g" || unit === "gram" || unit === "grams" || unit === "ml") grams = amount;
    else if (unit === "kg") grams = amount * 1000;
    else if (unit === "oz" || unit === "ounce") grams = amount * 28.35;
    else if (unit === "lb" || unit === "lbs") grams = amount * 453.59;
    else if (unit === "cup" || unit === "cups") grams = amount * 200;
    else if (unit === "scoop" || unit === "scoops") grams = amount * 30;
    else if (unit === "tbsp" || unit === "tablespoon") grams = amount * 15;
    else if (unit === "tsp" || unit === "teaspoon") grams = amount * 5;
    else if (unit === "can" || unit === "tin") grams = amount * 150;
    else grams = amount;
    const perPiece = gPerPc && gPerPc > 0 ? gPerPc : 50;
    return grams / perPiece;
  }

  // If base is grams/ml
  let grams = 0;
  
  if (!unit) {
    // No unit specified (e.g. "100 chicken"). 
    // If amount is large (>10), assume grams. If small (<10), might be pieces/servings? 
    // For simplicity, if base is 'g', assume input is grams if > 10, else assume it's a "serving" multiplier of defaultDef.
    if (amount > 10) return amount / 100;
    return (amount * defaultDef) / 100;
  }

  switch (unit) {
    case "g":
    case "gram":
    case "grams":
    case "ml":
      grams = amount;
      break;
    case "kg":
      grams = amount * 1000;
      break;
    case "oz":
    case "ounce":
      grams = amount * 28.35;
      break;
    case "lb":
    case "lbs":
      grams = amount * 453.59;
      break;
    case "pc":
    case "pcs":
    case "slice":
    case "slices":
      // "2 slices of chicken" -> 2 * defaultDef
      grams = amount * defaultDef;
      break;
    case "cup":
    case "cups":
      // Approx 200g/ml for generic cup if no specific density known
      // If defaultDef is close to 150-250, use it? No, keep simple.
      grams = amount * 200; 
      // Special case: Rice cup ~160g, Oats cup ~80g. 200 is a safe-ish average for cooked foods/liquids.
      break;
    case "scoop":
    case "scoops":
      grams = amount * 30; // Standard scoop
      break;
    case "tbsp":
    case "tablespoon":
      grams = amount * 15;
      break;
    case "tsp":
    case "teaspoon":
      grams = amount * 5;
      break;
    case "can":
    case "tin":
      grams = amount * 150; // Standard tuna/bean can size
      break;
    case "serving":
    case "servings":
    case "bowl":
    case "bowls":
    case "plate":
    case "plates":
    case "pack":
    case "packs":
    case "bag":
    case "bags":
      // Usually means "1 default definition" of that item
      grams = amount * defaultDef;
      break;
    default:
      // Unknown unit, fallback to grams if it looks like a weight, or default def
      grams = amount;
  }

  return grams / 100; // Return multiplier for 100g base
}

export function estimateNutrition(text: string) {
  // Normalize
  const cleanText = (text || "")
    .toLowerCase()
    .replace(/[,;\n]+/g, "|")
    .replace(/\s+\band\b\s+/g, "|")
    .replace(/\s*&\s+/g, "|");
  const items = cleanText.split("|").map((s) => s.trim()).filter(Boolean);

  const total = { p: 0, c: 0, f: 0, k: 0 };

  for (const itemStr of items) {
    // 1. Identify food keyword
    let bestMatch: string | null = null;
    let maxLen = 0;

    for (const key of Object.keys(DB)) {
      if (itemStr.includes(key)) {
        if (key.length > maxLen) {
          bestMatch = key;
          maxLen = key.length;
        }
      }
    }

    if (bestMatch) {
      const info = DB[bestMatch];
      const { amount, unit } = parseQuantity(itemStr);
      const mult = getMultiplier(amount, unit, info.unit, info.def || 100, info.gPerPc);

      total.p += info.p * mult;
      total.c += info.c * mult;
      total.f += info.f * mult;
      total.k += info.k * mult;
    }
  }

  return {
    protein: Math.round(total.p),
    calories: Math.round(total.k),
    carbs: Math.round(total.c),
    fats: Math.round(total.f),
  };
}
