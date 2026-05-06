import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4173);

const favorites = new Set();

const products = [
  {
    id: "fv-neo-jacket",
    name: "NeoShell Bomber",
    category: "Streetwear",
    target: "men",
    type: "jacket",
    price: 189,
    color: "#111827",
    accent: "#27d7ff",
    sizes: ["S", "M", "L", "XL"],
    material: "AeroTech nylon",
    fit: "Relaxed",
    brand: "FitVision Lab",
    tags: ["blue", "street", "rain"],
    rating: 4.9
  },
  {
    id: "fv-luxe-blazer",
    name: "Luxe Motion Blazer",
    category: "Suits",
    target: "men",
    type: "suit",
    price: 349,
    color: "#101114",
    accent: "#ffffff",
    sizes: ["M", "L", "XL"],
    material: "Wool stretch",
    fit: "Tailored",
    brand: "Atelier One",
    tags: ["black", "formal", "office"],
    rating: 4.8
  },
  {
    id: "fv-red-parka",
    name: "Red Pulse Parka",
    category: "Women",
    target: "women",
    type: "jacket",
    price: 229,
    color: "#d72657",
    accent: "#f6c85f",
    sizes: ["XS", "S", "M", "L"],
    material: "Thermo shell",
    fit: "Comfort",
    brand: "Northline",
    tags: ["red", "winter", "warm"],
    rating: 4.7
  },
  {
    id: "fv-white-tee",
    name: "CloudFit T-Shirt",
    category: "Men",
    target: "all",
    type: "shirt",
    price: 49,
    color: "#f7f9fc",
    accent: "#111111",
    sizes: ["S", "M", "L", "XL"],
    material: "Pima cotton",
    fit: "Regular",
    brand: "FitVision Essentials",
    tags: ["white", "basic", "summer"],
    rating: 4.6
  },
  {
    id: "fv-yoga-set",
    name: "FlexFlow Sport Set",
    category: "Sport",
    target: "women",
    type: "sport",
    price: 118,
    color: "#0f766e",
    accent: "#35f2b8",
    sizes: ["XS", "S", "M", "L"],
    material: "DryMove knit",
    fit: "Compression",
    brand: "Kinetic",
    tags: ["sport", "purple", "training"],
    rating: 4.8
  },
  {
    id: "fv-denim-kids",
    name: "Junior Denim Jacket",
    category: "Kids",
    target: "kids",
    type: "jacket",
    price: 79,
    color: "#2d66c3",
    accent: "#ffd166",
    sizes: ["Kids S", "Kids M", "Kids L"],
    material: "Soft denim",
    fit: "Easy",
    brand: "Mini Mode",
    tags: ["kids", "denim", "blue"],
    rating: 4.5
  },
  {
    id: "fv-cargo-pants",
    name: "Urban Cargo Pants",
    category: "Streetwear",
    target: "all",
    type: "pants",
    price: 132,
    color: "#1f2937",
    accent: "#8be28b",
    sizes: ["S", "M", "L", "XL"],
    material: "Ripstop cotton",
    fit: "Loose",
    brand: "Signal",
    tags: ["green", "pants", "street"],
    rating: 4.7
  },
  {
    id: "fv-runner-shoes",
    name: "AeroRunner X",
    category: "Shoes",
    target: "all",
    type: "shoes",
    price: 158,
    color: "#edf2f7",
    accent: "#0b74ff",
    sizes: ["38", "39", "40", "41", "42", "43", "44"],
    material: "Knit mesh",
    fit: "True size",
    brand: "Stride",
    tags: ["shoes", "white", "running"],
    rating: 4.9
  },
  {
    id: "fv-sun-glasses",
    name: "Matrix Glasses",
    category: "Glasses",
    target: "all",
    type: "glasses",
    price: 96,
    color: "#111111",
    accent: "#27d7ff",
    sizes: ["One size"],
    material: "Titanium frame",
    fit: "Face adaptive",
    brand: "Optik Lab",
    tags: ["glasses", "black", "accessory"],
    rating: 4.6
  },
  {
    id: "fv-watch",
    name: "Orbit Watch",
    category: "Watches",
    target: "all",
    type: "watch",
    price: 279,
    color: "#141414",
    accent: "#f6c85f",
    sizes: ["40mm", "44mm"],
    material: "Ceramic steel",
    fit: "Adjustable",
    brand: "Orbit",
    tags: ["watch", "black", "premium"],
    rating: 4.8
  },
  {
    id: "fv-cap",
    name: "AirPeak Cap",
    category: "Hats",
    target: "all",
    type: "hat",
    price: 42,
    color: "#0c0d10",
    accent: "#0b74ff",
    sizes: ["One size"],
    material: "CoolMax cotton",
    fit: "Adjustable",
    brand: "Peak",
    tags: ["hat", "cap", "black"],
    rating: 4.4
  },
  {
    id: "fv-evening-dress",
    name: "Liquid Satin Dress",
    category: "Women",
    target: "women",
    type: "dress",
    price: 265,
    color: "#1c1b2e",
    accent: "#ff7a90",
    sizes: ["XS", "S", "M", "L"],
    material: "Satin stretch",
    fit: "Body contour",
    brand: "Atelier One",
    tags: ["dress", "evening", "navy"],
    rating: 4.9
  }
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sendJson(res, status, data) {
  const payload = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sizeRecommendation(profile) {
  const height = Number(profile.height || 172);
  const weight = Number(profile.weight || 70);
  const shape = String(profile.shape || "regular");
  const bmi = weight / Math.pow(height / 100, 2);
  let size = "M";
  let confidence = 0.86;

  if (height < 158 || weight < 53 || bmi < 19) size = "S";
  if ((height >= 170 && weight >= 72) || bmi >= 24.5) size = "L";
  if (height >= 184 || weight >= 92 || bmi >= 29) size = "XL";
  if (shape === "athletic" && size === "M") size = "L";
  if (shape === "slim" && size === "L") size = "M";
  if (shape === "kids") size = weight > 34 ? "Kids L" : weight > 25 ? "Kids M" : "Kids S";

  const chest = Math.round(height * 0.52 + weight * 0.32);
  const waist = Math.round(height * 0.42 + weight * 0.36);
  const inseam = Math.round(height * 0.45);
  if (Math.abs(bmi - 23) < 1.3) confidence = 0.91;

  return {
    size,
    confidence,
    measurements: { chest, waist, inseam },
    fitProfile: shape,
    notes: [
      `${size} sizga eng yaxshi boshlang'ich fit beradi.`,
      waist > 88 ? "Bel qismi uchun stretch yoki relaxed fit qulayroq." : "Slim va regular fit variantlari mos keladi.",
      chest > 102 ? "Yelka qismi kengroq kiyimlarda tabiiy turadi." : "Yelka chizig'i klassik proporsiyada ko'rinadi."
    ]
  };
}

function stylistAdvice(payload) {
  const favoriteIds = Array.isArray(payload.favorites) ? payload.favorites : [];
  const occasion = String(payload.occasion || "daily");
  const weather = String(payload.weather || "mild");
  const selectedId = String(payload.selectedId || "");
  const selected = products.find(item => item.id === selectedId) || products[0];

  const pool = products.filter(item => {
    if (occasion === "office") return ["Suits", "Men", "Women", "Watches", "Shoes", "Glasses"].includes(item.category);
    if (occasion === "sport") return ["Sport", "Shoes", "Watches"].includes(item.category);
    if (occasion === "street") return ["Streetwear", "Shoes", "Hats", "Glasses"].includes(item.category);
    return true;
  });

  const outfit = [
    selected,
    ...pool.filter(item => item.id !== selected.id && !favoriteIds.includes(item.id)).slice(0, 3)
  ].slice(0, 4);

  const weatherLine = weather.includes("cold") || weather.includes("rain")
    ? "Bugun qatlamli outfit tanlang: tashqi kiyim, yopiq oyoq kiyim va suvga chidamli material."
    : weather.includes("hot")
      ? "Yengil mato, oq yoki sovuq ranglar va nafas oladigan siluet yaxshi ishlaydi."
      : "Balansli ranglar va smart-casual qatlamlar kun bo'yi chiroyli turadi.";

  return {
    headline: "AI Stylist tanlovi tayyor",
    advice: `${selected.name} sizga yaxshi tushadi: rang kontrasti toza, siluet esa tanani uzunroq ko'rsatadi. ${weatherLine}`,
    outfit: outfit.map(({ id, name, category, color, accent, price }) => ({ id, name, category, color, accent, price })),
    styleScore: Math.round(88 + Math.random() * 8),
    tags: ["premium", occasion, weather, selected.fit.toLowerCase()]
  };
}

function voiceCommand(text) {
  const normalized = String(text || "").toLowerCase();
  const colorMap = {
    red: ["red", "qizil"],
    blue: ["blue", "ko'k", "kok"],
    black: ["black", "qora"],
    white: ["white", "oq"],
    green: ["green", "yashil"]
  };
  const typeMap = {
    jacket: ["jacket", "kurtka", "parka", "bomber"],
    suit: ["suit", "kostyum", "blazer"],
    shoes: ["shoes", "oyoq", "krossovka"],
    glasses: ["glasses", "ko'zoynak", "kozoynak"],
    watch: ["watch", "soat"],
    hat: ["hat", "cap", "kepka"]
  };

  const color = Object.entries(colorMap).find(([, words]) => words.some(word => normalized.includes(word)))?.[0];
  const type = Object.entries(typeMap).find(([, words]) => words.some(word => normalized.includes(word)))?.[0];
  const product = products.find(item => (!color || item.tags.includes(color)) && (!type || item.type === type));

  return {
    command: text,
    color,
    type,
    productId: product?.id || products[0].id,
    message: product ? `${product.name} tanlandi.` : "Eng yaqin mos kiyim tanlandi."
  };
}

function trends() {
  return [
    { title: "Monochrome tailoring", score: 94, signal: "Office va premium retail uchun kuchli trend" },
    { title: "Weather-smart layers", score: 91, signal: "Kuz-qish kolleksiyalarida yuqori talab" },
    { title: "Sport-luxe sets", score: 89, signal: "Daily outfit va gym crossover segmenti o'smoqda" },
    { title: "Clean tech accessories", score: 87, signal: "Ko'zoynak, soat va minimal aksessuarlar trendda" }
  ];
}

function serveStatic(res, requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  try {
    if (url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, app: "FitVision AI", mode: "demo", timestamp: new Date().toISOString() });
      return;
    }

    if (url.pathname === "/api/products") {
      const category = url.searchParams.get("category");
      const target = url.searchParams.get("target");
      let result = products;
      if (category && category !== "All") result = result.filter(item => item.category === category);
      if (target && target !== "all") result = result.filter(item => item.target === target || item.target === "all");
      sendJson(res, 200, { products: result, count: result.length });
      return;
    }

    if (url.pathname === "/api/size-recommendation" && req.method === "POST") {
      sendJson(res, 200, sizeRecommendation(await readBody(req)));
      return;
    }

    if (url.pathname === "/api/stylist" && req.method === "POST") {
      sendJson(res, 200, stylistAdvice(await readBody(req)));
      return;
    }

    if (url.pathname === "/api/favorites") {
      if (req.method === "POST") {
        const body = await readBody(req);
        if (body.productId) {
          if (body.active === false) favorites.delete(body.productId);
          else favorites.add(body.productId);
        }
      }
      sendJson(res, 200, { favorites: [...favorites] });
      return;
    }

    if (url.pathname === "/api/trends") {
      sendJson(res, 200, { trends: trends() });
      return;
    }

    if (url.pathname === "/api/voice-command" && req.method === "POST") {
      sendJson(res, 200, voiceCommand((await readBody(req)).text));
      return;
    }

    serveStatic(res, decodeURIComponent(url.pathname));
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, () => {
  console.log(`FitVision AI running at http://localhost:${port}`);
});
