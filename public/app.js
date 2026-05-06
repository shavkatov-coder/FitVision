const categories = [
  { name: "All", icon: "sparkles" },
  { name: "Men", icon: "user-round" },
  { name: "Women", icon: "gem" },
  { name: "Kids", icon: "baby" },
  { name: "Sport", icon: "activity" },
  { name: "Suits", icon: "briefcase-business" },
  { name: "Streetwear", icon: "shirt" },
  { name: "Shoes", icon: "footprints" },
  { name: "Glasses", icon: "glasses" },
  { name: "Watches", icon: "watch" },
  { name: "Hats", icon: "crown" }
];

const state = {
  products: [],
  selected: null,
  category: "All",
  target: "all",
  favorites: new Set(JSON.parse(localStorage.getItem("fitvision:favorites") || "[]")),
  mode: "camera",
  stream: null,
  pose: null,
  poseReady: false,
  landmarks: null,
  lastPoseAt: 0,
  poseBusy: false,
  compare: 0.58,
  mirror: true,
  beauty: false,
  frameId: null,
  three: null
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  await loadProducts();
  renderCategories();
  renderProducts();
  selectProduct(state.products[0]?.id);
  renderFavorites();
  await Promise.all([recommendSize(), loadTrends()]);
  await askStylist(false);
  initThreeScene();
  updateMode("camera");
  animate();
  refreshIcons();
  checkBackend();
}

function cacheElements() {
  Object.assign(el, {
    categoryList: document.querySelector("#categoryList"),
    productGrid: document.querySelector("#productGrid"),
    selectedName: document.querySelector("#selectedName"),
    selectedArt: document.querySelector("#selectedArt"),
    selectedMeta: document.querySelector("#selectedMeta"),
    favoriteBtn: document.querySelector("#favoriteBtn"),
    favoriteList: document.querySelector("#favoriteList"),
    favoriteCount: document.querySelector("#favoriteCount"),
    cameraFeed: document.querySelector("#cameraFeed"),
    photoPreview: document.querySelector("#photoPreview"),
    photoInput: document.querySelector("#photoInput"),
    startCameraBtn: document.querySelector("#startCameraBtn"),
    saveBtn: document.querySelector("#saveBtn"),
    shareBtn: document.querySelector("#shareBtn"),
    voiceBtn: document.querySelector("#voiceBtn"),
    mirrorBtn: document.querySelector("#mirrorBtn"),
    beautyBtn: document.querySelector("#beautyBtn"),
    stage: document.querySelector("#tryonStage"),
    stageWrap: document.querySelector(".stage-wrap"),
    canvas: document.querySelector("#tryonCanvas"),
    emptyState: document.querySelector("#emptyState"),
    trackingText: document.querySelector("#trackingText"),
    trackingChip: document.querySelector("#trackingChip"),
    compareSlider: document.querySelector("#compareSlider"),
    heightInput: document.querySelector("#heightInput"),
    weightInput: document.querySelector("#weightInput"),
    shapeInput: document.querySelector("#shapeInput"),
    sizeBtn: document.querySelector("#sizeBtn"),
    sizeBadge: document.querySelector("#sizeBadge"),
    sizeResult: document.querySelector("#sizeResult"),
    targetFilters: document.querySelector("#targetFilters"),
    stylistBtn: document.querySelector("#stylistBtn"),
    stylistOutput: document.querySelector("#stylistOutput"),
    occasionInput: document.querySelector("#occasionInput"),
    weatherInput: document.querySelector("#weatherInput"),
    trendList: document.querySelector("#trendList"),
    miniScene: document.querySelector("#miniScene")
  });
}

function bindEvents() {
  document.querySelectorAll("[data-scroll-target]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#${button.dataset.scrollTarget}`)?.scrollIntoView({ block: "start" });
    });
  });

  document.querySelectorAll("[data-mode]").forEach(button => {
    button.addEventListener("click", () => updateMode(button.dataset.mode));
  });

  el.startCameraBtn.addEventListener("click", startCamera);
  el.photoInput.addEventListener("change", handlePhotoUpload);
  el.compareSlider.addEventListener("input", event => {
    state.compare = Number(event.target.value) / 100;
  });
  el.mirrorBtn.addEventListener("click", () => {
    state.mirror = !state.mirror;
    el.stageWrap.classList.toggle("mirror-off", !state.mirror);
    el.mirrorBtn.classList.toggle("active", !state.mirror);
  });
  el.beautyBtn.addEventListener("click", () => {
    state.beauty = !state.beauty;
    el.stageWrap.classList.toggle("beauty-on", state.beauty);
    el.beautyBtn.classList.toggle("active", state.beauty);
  });
  el.favoriteBtn.addEventListener("click", () => toggleFavorite(state.selected?.id));
  el.saveBtn.addEventListener("click", saveLook);
  el.shareBtn.addEventListener("click", shareLook);
  el.voiceBtn.addEventListener("click", startVoiceCommand);
  el.sizeBtn.addEventListener("click", recommendSize);
  [el.heightInput, el.weightInput, el.shapeInput].forEach(input => {
    input.addEventListener("change", recommendSize);
  });
  el.targetFilters.addEventListener("click", event => {
    const button = event.target.closest("[data-target]");
    if (!button) return;
    state.target = button.dataset.target;
    el.targetFilters.querySelectorAll(".filter").forEach(filter => filter.classList.remove("active"));
    button.classList.add("active");
    renderProducts();
  });
  el.stylistBtn.addEventListener("click", () => askStylist(true));
  [el.occasionInput, el.weatherInput].forEach(input => {
    input.addEventListener("change", () => askStylist(false));
  });
  window.addEventListener("resize", () => {
    renderSelectedArt();
    renderProducts();
    resizeThree();
  });
}

async function loadProducts() {
  const response = await fetch("/api/products");
  const data = await response.json();
  state.products = data.products || [];
}

function renderCategories() {
  el.categoryList.innerHTML = categories.map(category => `
    <button class="category-btn ${category.name === state.category ? "active" : ""}" data-category="${category.name}" type="button">
      <i data-lucide="${category.icon}"></i>
      <span>${category.name}</span>
    </button>
  `).join("");

  el.categoryList.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    el.categoryList.querySelectorAll(".category-btn").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    renderProducts();
  });

  refreshIcons();
}

function renderProducts() {
  const visibleProducts = state.products.filter(product => {
    const categoryMatch = state.category === "All" || product.category === state.category;
    const targetMatch = state.target === "all" || product.target === state.target || product.target === "all";
    return categoryMatch && targetMatch;
  });

  el.productGrid.innerHTML = visibleProducts.map(product => `
    <article class="product-card ${product.id === state.selected?.id ? "selected" : ""}" data-product-id="${product.id}">
      <div class="product-visual">
        <canvas aria-label="${product.name} preview"></canvas>
      </div>
      <div class="product-info">
        <p>${product.brand} · ${product.category}</p>
        <h3>${product.name}</h3>
        <p>${product.material} · ${product.fit}</p>
        <div class="card-foot">
          <span class="price">$${product.price}</span>
          <button class="try-btn" type="button" data-try-id="${product.id}">Try on</button>
        </div>
      </div>
    </article>
  `).join("");

  if (!visibleProducts.length) {
    el.productGrid.innerHTML = `<div class="ai-message"><strong>Katalog bo'sh</strong><p>Bu filtr uchun demo mahsulot topilmadi.</p></div>`;
  }

  el.productGrid.querySelectorAll(".product-card").forEach(card => {
    const product = state.products.find(item => item.id === card.dataset.productId);
    drawProductCanvas(card.querySelector("canvas"), product);
    card.addEventListener("click", event => {
      const id = event.target.closest("[data-try-id]")?.dataset.tryId || card.dataset.productId;
      selectProduct(id);
    });
  });

  refreshIcons();
}

function selectProduct(id) {
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  state.selected = product;
  el.selectedName.textContent = product.name;
  el.favoriteBtn.classList.toggle("active", state.favorites.has(product.id));
  renderSelectedMeta();
  renderSelectedArt();
  renderProductsSelection();
  updateThreeProduct();
  askStylist(false);
}

function renderProductsSelection() {
  el.productGrid.querySelectorAll(".product-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.productId === state.selected?.id);
  });
}

function renderSelectedMeta() {
  const product = state.selected;
  el.selectedMeta.innerHTML = [
    ["Narx", `$${product.price}`],
    ["Fit", product.fit],
    ["Size", product.sizes.join(" / ")],
    ["Rating", product.rating.toFixed(1)]
  ].map(([label, value]) => `
    <div class="meta-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function renderSelectedArt() {
  if (!state.selected) return;
  el.selectedArt.innerHTML = `<canvas aria-label="${state.selected.name} premium preview"></canvas>`;
  drawProductCanvas(el.selectedArt.querySelector("canvas"), state.selected, true);
}

function drawProductCanvas(canvas, product, large = false) {
  if (!canvas || !product) return;
  const { ctx, width, height } = setupCanvas(canvas);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, withAlpha(product.color, 0.16));
  gradient.addColorStop(0.48, "#ffffff");
  gradient.addColorStop(1, withAlpha(product.accent, 0.18));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height * 0.55);
  const scale = large ? Math.min(width, height) / 210 : Math.min(width, height) / 185;
  ctx.scale(scale, scale);
  drawProductShape(ctx, product, 0, 0, 1);
  ctx.restore();

  ctx.fillStyle = "rgba(12, 13, 16, 0.78)";
  ctx.font = "700 11px Inter, sans-serif";
  ctx.fillText(product.category.toUpperCase(), 14, 22);

  ctx.fillStyle = product.accent;
  roundRect(ctx, width - 54, 14, 36, 8, 4);
  ctx.fill();
}

function drawProductShape(ctx, product, x, y, alpha = 0.92) {
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  const color = product.color;
  const accent = product.accent;
  const type = product.type;

  if (["jacket", "shirt", "suit", "sport"].includes(type)) {
    drawGarmentTopIcon(ctx, x, y, color, accent, type);
  } else if (type === "pants") {
    drawPantsIcon(ctx, x, y, color, accent);
  } else if (type === "shoes") {
    drawShoesIcon(ctx, x, y, color, accent);
  } else if (type === "glasses") {
    drawGlassesIcon(ctx, x, y, color, accent);
  } else if (type === "watch") {
    drawWatchIcon(ctx, x, y, color, accent);
  } else if (type === "hat") {
    drawHatIcon(ctx, x, y, color, accent);
  } else if (type === "dress") {
    drawDressIcon(ctx, x, y, color, accent);
  }

  ctx.globalAlpha = 1;
}

function drawGarmentTopIcon(ctx, x, y, color, accent, type) {
  const isSuit = type === "suit";
  const isSport = type === "sport";
  const isShirt = type === "shirt";
  const grad = ctx.createLinearGradient(x - 80, y - 88, x + 80, y + 98);
  grad.addColorStop(0, lighten(color, 34));
  grad.addColorStop(0.46, color);
  grad.addColorStop(1, darken(color, 20));
  ctx.strokeStyle = withAlpha("#0c0d10", 0.24);

  ctx.fillStyle = grad;
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.moveTo(x + side * 40, y - 68);
    ctx.quadraticCurveTo(x + side * 92, y - 42, x + side * 95, y + 18);
    ctx.quadraticCurveTo(x + side * 82, y + 34, x + side * 62, y + 28);
    ctx.quadraticCurveTo(x + side * 52, y - 16, x + side * 33, y - 58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x - 42, y - 78);
  ctx.quadraticCurveTo(x - 18, y - 62, x, y - 55);
  ctx.quadraticCurveTo(x + 18, y - 62, x + 42, y - 78);
  ctx.quadraticCurveTo(x + 72, y - 40, x + 62, y + 90);
  ctx.quadraticCurveTo(x, y + 105, x - 62, y + 90);
  ctx.quadraticCurveTo(x - 72, y - 40, x - 42, y - 78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = withAlpha("#ffffff", 0.3);
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + i * 20, y - 30);
    ctx.quadraticCurveTo(x + i * 17, y + 20, x + i * 14, y + 88);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = withAlpha(accent, 0.92);
  ctx.lineWidth = isSport ? 8 : 5;
  ctx.beginPath();
  ctx.moveTo(x, y - 55);
  ctx.lineTo(x, y + 88);
  ctx.stroke();

  if (isSuit) {
    ctx.fillStyle = withAlpha("#ffffff", 0.88);
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 48);
    ctx.lineTo(x - 30, y + 8);
    ctx.lineTo(x - 4, y + 18);
    ctx.lineTo(x + 22, y + 8);
    ctx.closePath();
    ctx.fill();
  } else if (!isShirt) {
    ctx.strokeStyle = withAlpha("#ffffff", 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 34, y - 48);
    ctx.quadraticCurveTo(x - 48, y + 10, x - 38, y + 72);
    ctx.moveTo(x + 34, y - 48);
    ctx.quadraticCurveTo(x + 48, y + 10, x + 38, y + 72);
    ctx.stroke();
  }

  ctx.fillStyle = withAlpha("#ffffff", 0.74);
  ctx.beginPath();
  ctx.moveTo(x - 28, y - 75);
  ctx.lineTo(x, y - 50);
  ctx.lineTo(x + 28, y - 75);
  ctx.quadraticCurveTo(x, y - 62, x - 28, y - 75);
  ctx.fill();
}

function drawDressIcon(ctx, x, y, color, accent) {
  const grad = ctx.createLinearGradient(x - 64, y - 82, x + 64, y + 98);
  grad.addColorStop(0, lighten(color, 28));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.strokeStyle = withAlpha("#0c0d10", 0.24);
  ctx.beginPath();
  ctx.moveTo(x - 28, y - 84);
  ctx.quadraticCurveTo(x, y - 56, x + 28, y - 84);
  ctx.lineTo(x + 44, y - 34);
  ctx.lineTo(x + 78, y + 94);
  ctx.lineTo(x - 78, y + 94);
  ctx.lineTo(x - 44, y - 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = withAlpha(accent, 0.9);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 36, y - 22);
  ctx.quadraticCurveTo(x, y - 6, x + 36, y - 22);
  ctx.stroke();
}

function drawPantsIcon(ctx, x, y, color, accent) {
  const grad = ctx.createLinearGradient(x - 52, y - 78, x + 48, y + 96);
  grad.addColorStop(0, lighten(color, 18));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.strokeStyle = withAlpha("#0c0d10", 0.25);
  ctx.beginPath();
  ctx.moveTo(x - 48, y - 82);
  ctx.lineTo(x + 48, y - 82);
  ctx.lineTo(x + 62, y + 96);
  ctx.lineTo(x + 10, y + 96);
  ctx.lineTo(x, y - 10);
  ctx.lineTo(x - 10, y + 96);
  ctx.lineTo(x - 62, y + 96);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = withAlpha(accent, 0.75);
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 48);
  ctx.lineTo(x - 9, y - 34);
  ctx.moveTo(x + 34, y - 48);
  ctx.lineTo(x + 9, y - 34);
  ctx.stroke();
}

function drawShoesIcon(ctx, x, y, color, accent) {
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  [-42, 42].forEach(offset => {
    ctx.strokeStyle = withAlpha("#0c0d10", 0.24);
    ctx.beginPath();
    ctx.moveTo(x + offset - 46, y + 18);
    ctx.quadraticCurveTo(x + offset - 28, y - 28, x + offset + 22, y - 22);
    ctx.quadraticCurveTo(x + offset + 54, y - 10, x + offset + 58, y + 20);
    ctx.quadraticCurveTo(x + offset + 18, y + 34, x + offset - 50, y + 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x + offset - 12, y - 12);
    ctx.lineTo(x + offset + 22, y - 8);
    ctx.stroke();
  });
}

function drawGlassesIcon(ctx, x, y, color, accent) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(x - 78, y - 24, 58, 42, 16);
  ctx.roundRect(x + 20, y - 24, 58, 42, 16);
  ctx.moveTo(x - 20, y - 4);
  ctx.quadraticCurveTo(x, y - 16, x + 20, y - 4);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 68, y - 2);
  ctx.lineTo(x - 30, y - 2);
  ctx.moveTo(x + 30, y - 2);
  ctx.lineTo(x + 68, y - 2);
  ctx.stroke();
}

function drawWatchIcon(ctx, x, y, color, accent) {
  ctx.fillStyle = color;
  roundRect(ctx, x - 18, y - 80, 36, 160, 14);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 18, y - 15);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 24);
  ctx.stroke();
}

function drawHatIcon(ctx, x, y, color, accent) {
  ctx.fillStyle = color;
  ctx.strokeStyle = withAlpha("#0c0d10", 0.24);
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 88, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 58, y + 4);
  ctx.quadraticCurveTo(x - 36, y - 78, x + 42, y - 62);
  ctx.quadraticCurveTo(x + 62, y - 26, x + 58, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  roundRect(ctx, x - 34, y - 15, 68, 11, 5);
  ctx.fill();
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setTracking("Camera unavailable");
    return;
  }

  try {
    stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    state.stream = stream;
    el.cameraFeed.srcObject = stream;
    await el.cameraFeed.play();
    el.cameraFeed.classList.add("visible");
    el.photoPreview.classList.remove("visible");
    el.emptyState.classList.add("hidden");
    updateMode("camera");
    setTracking("Body tracking...");
    await initPose();
    runPoseLoop();
  } catch (error) {
    console.error(error);
    setTracking("Camera blocked");
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
  }
  state.stream = null;
}

async function initPose() {
  if (state.poseReady || state.pose) return;
  if (!window.Pose) {
    setTracking("Smart overlay");
    return;
  }

  try {
    const pose = new window.Pose({
      locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.52
    });
    pose.onResults(results => {
      state.landmarks = results.poseLandmarks || null;
      state.lastPoseAt = performance.now();
    });
    state.pose = pose;
    state.poseReady = true;
    setTracking("MediaPipe ready");
  } catch (error) {
    console.error(error);
    setTracking("Smart overlay");
  }
}

function runPoseLoop() {
  if (!state.poseReady || !state.stream || state.poseBusy) return;
  const tick = async () => {
    if (!state.stream || !state.poseReady) return;
    if (el.cameraFeed.readyState >= 2) {
      state.poseBusy = true;
      try {
        await state.pose.send({ image: el.cameraFeed });
      } catch (error) {
        console.warn(error);
      } finally {
        state.poseBusy = false;
      }
    }
    setTimeout(tick, 58);
  };
  tick();
}

function handlePhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    el.photoPreview.src = String(reader.result);
    el.photoPreview.onload = async () => {
      el.photoPreview.classList.add("visible");
      el.cameraFeed.classList.remove("visible");
      el.emptyState.classList.add("hidden");
      updateMode("photo");
      await initPose();
      if (state.poseReady) {
        try {
          await state.pose.send({ image: el.photoPreview });
          setTracking("Photo tracked");
        } catch (error) {
          console.warn(error);
          state.landmarks = null;
          setTracking("Photo fitted");
        }
      } else {
        state.landmarks = null;
        setTracking("Photo fitted");
      }
    };
  };
  reader.readAsDataURL(file);
}

function updateMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  el.stage.classList.toggle("compare-on", mode === "compare");
  if (mode === "photo" || mode === "compare") {
    if (el.photoPreview.src) {
      el.photoPreview.classList.add("visible");
      el.cameraFeed.classList.remove("visible");
      el.emptyState.classList.add("hidden");
    } else if (state.stream) {
      el.cameraFeed.classList.add("visible");
      el.emptyState.classList.add("hidden");
    }
  }

  if (mode === "camera" && state.stream) {
    el.cameraFeed.classList.add("visible");
    el.photoPreview.classList.remove("visible");
  }

  updateEmptyState();
}

function updateEmptyState() {
  const hasCamera = Boolean(state.stream && el.cameraFeed.classList.contains("visible"));
  const hasPhoto = Boolean(el.photoPreview.src && el.photoPreview.classList.contains("visible"));
  el.emptyState.classList.toggle("hidden", hasCamera || hasPhoto);
}

function animate() {
  drawTryOn();
  state.frameId = requestAnimationFrame(animate);
}

function drawTryOn(targetCtx, widthOverride, heightOverride, exportMode = false) {
  const canvas = exportMode ? null : el.canvas;
  let ctx;
  let width;
  let height;

  if (exportMode) {
    ctx = targetCtx;
    width = widthOverride;
    height = heightOverride;
  } else {
    const setup = setupCanvas(canvas);
    ctx = setup.ctx;
    width = setup.width;
    height = setup.height;
    ctx.clearRect(0, 0, width, height);
  }

  if (!state.selected) return;

  const anchors = getBodyAnchors(width, height);
  const compareMode = state.mode === "compare" && !exportMode;

  if (compareMode) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(width * state.compare, 0, width * (1 - state.compare), height);
    ctx.clip();
    drawGarment(ctx, state.selected, anchors, width, height);
    ctx.restore();
    drawCompareGuide(ctx, width, height);
  } else {
    drawGarment(ctx, state.selected, anchors, width, height);
  }

  if (!exportMode) {
    drawTrackingDots(ctx, anchors);
  }
}

function getBodyAnchors(width, height) {
  const lm = state.landmarks;
  const fresh = lm && performance.now() - state.lastPoseAt < 1500;
  const mediaRect = getActiveMediaRect(width, height);

  if (fresh) {
    const p = index => {
      const point = lm[index];
      if (!point) return null;
      const normalizedX = state.mirror ? 1 - point.x : point.x;
      return {
        x: mediaRect.x + normalizedX * mediaRect.width,
        y: mediaRect.y + point.y * mediaRect.height,
        z: point.z || 0,
        visibility: point.visibility || 0
      };
    };
    return {
      tracked: true,
      nose: p(0),
      leftEyeInner: p(1),
      leftEye: p(2),
      leftEyeOuter: p(3),
      rightEyeInner: p(4),
      rightEye: p(5),
      rightEyeOuter: p(6),
      leftEar: p(7),
      rightEar: p(8),
      leftShoulder: p(11),
      rightShoulder: p(12),
      leftElbow: p(13),
      rightElbow: p(14),
      leftWrist: p(15),
      rightWrist: p(16),
      leftHip: p(23),
      rightHip: p(24),
      leftKnee: p(25),
      rightKnee: p(26),
      leftAnkle: p(27),
      rightAnkle: p(28)
    };
  }

  const t = performance.now() / 1000;
  const sway = Math.sin(t * 1.2) * width * 0.018;
  const bounce = Math.cos(t * 1.5) * height * 0.008;
  const cx = mediaRect.x + mediaRect.width / 2 + sway;
  const shoulderY = mediaRect.y + mediaRect.height * 0.28 + bounce;
  const hipY = mediaRect.y + mediaRect.height * 0.58 + bounce;
  const ankleY = mediaRect.y + mediaRect.height * 0.86 + bounce;
  const shoulderW = mediaRect.width * 0.32;
  const hipW = mediaRect.width * 0.22;
  const faceY = mediaRect.y + mediaRect.height * 0.18 + bounce;
  const eyeY = mediaRect.y + mediaRect.height * 0.155 + bounce;
  const eyeW = shoulderW * 0.22;
  return {
    tracked: false,
    nose: { x: cx, y: faceY },
    leftEye: { x: cx - eyeW / 2, y: eyeY },
    rightEye: { x: cx + eyeW / 2, y: eyeY },
    leftEar: { x: cx - shoulderW * 0.22, y: faceY },
    rightEar: { x: cx + shoulderW * 0.22, y: faceY },
    leftShoulder: { x: cx - shoulderW / 2, y: shoulderY },
    rightShoulder: { x: cx + shoulderW / 2, y: shoulderY },
    leftElbow: { x: cx - shoulderW * 0.58, y: height * 0.42 + bounce },
    rightElbow: { x: cx + shoulderW * 0.58, y: height * 0.42 + bounce },
    leftWrist: { x: cx - shoulderW * 0.64, y: height * 0.56 + bounce },
    rightWrist: { x: cx + shoulderW * 0.64, y: height * 0.56 + bounce },
    leftHip: { x: cx - hipW / 2, y: hipY },
    rightHip: { x: cx + hipW / 2, y: hipY },
    leftKnee: { x: cx - hipW * 0.34, y: height * 0.72 + bounce },
    rightKnee: { x: cx + hipW * 0.34, y: height * 0.72 + bounce },
    leftAnkle: { x: cx - hipW * 0.38, y: ankleY },
    rightAnkle: { x: cx + hipW * 0.38, y: ankleY }
  };
}

function getActiveMediaRect(width, height) {
  const media = getActiveMedia();
  if (!media) {
    return { x: 0, y: 0, width, height, fit: "cover" };
  }

  const sourceW = media.videoWidth || media.naturalWidth || width;
  const sourceH = media.videoHeight || media.naturalHeight || height;
  const isPhoto = media === el.photoPreview && el.photoPreview.classList.contains("visible");
  const fit = isPhoto ? "contain" : "cover";
  const scale = fit === "contain"
    ? Math.min(width / sourceW, height / sourceH)
    : Math.max(width / sourceW, height / sourceH);
  const displayW = sourceW * scale;
  const displayH = sourceH * scale;

  return {
    x: (width - displayW) / 2,
    y: (height - displayH) / 2,
    width: displayW,
    height: displayH,
    fit
  };
}

function drawGarment(ctx, product, anchors, width, height) {
  const type = product.type;
  ctx.save();
  ctx.shadowColor = withAlpha("#000000", 0.28);
  ctx.shadowBlur = Math.max(16, width * 0.025);
  ctx.shadowOffsetY = Math.max(5, height * 0.01);

  if (["jacket", "shirt", "suit", "sport"].includes(type)) {
    drawLiveTop(ctx, product, anchors, width, height);
  } else if (type === "dress") {
    drawLiveDress(ctx, product, anchors, width, height);
  } else if (type === "pants") {
    drawLivePants(ctx, product, anchors, width, height);
  } else if (type === "shoes") {
    drawLiveShoes(ctx, product, anchors, width, height);
  } else if (type === "glasses") {
    drawLiveGlasses(ctx, product, anchors, width);
  } else if (type === "watch") {
    drawLiveWatch(ctx, product, anchors, width);
  } else if (type === "hat") {
    drawLiveHat(ctx, product, anchors, width);
  }

  ctx.restore();

  if (!anchors.tracked) {
    const photoVisible = el.photoPreview.classList.contains("visible");
    if (photoVisible && ["glasses", "hat"].includes(type)) {
      setTracking("Face not detected");
    } else if (photoVisible && type === "watch") {
      setTracking("Wrist not detected");
    } else if (photoVisible && type === "shoes") {
      setTracking("Feet not detected");
    } else {
      setTracking("Smart overlay");
    }
  } else {
    setTracking("Body tracked");
  }
}

function drawLiveTop(ctx, product, anchors, width, height) {
  const sl = anchors.leftShoulder;
  const sr = anchors.rightShoulder;
  const hl = anchors.leftHip;
  const hr = anchors.rightHip;
  const le = anchors.leftElbow;
  const re = anchors.rightElbow;
  const lw = anchors.leftWrist;
  const rw = anchors.rightWrist;
  const shoulderWidth = distance(sl, sr);
  const hipWidth = Math.max(distance(hl, hr), shoulderWidth * 0.58);
  const torsoHeight = Math.max(distance(mid(sl, sr), mid(hl, hr)), height * 0.22);
  const pad = shoulderWidth * (product.type === "suit" ? 0.2 : 0.17);
  const sleeve = product.type === "shirt" ? 0.68 : 1;
  const color = product.color;
  const accent = product.accent;
  const shoulderMid = mid(sl, sr);
  const hipMid = mid(hl, hr);
  const neckY = Math.min(sl.y, sr.y) - torsoHeight * 0.08;
  const collarL = { x: shoulderMid.x - shoulderWidth * 0.12, y: neckY + torsoHeight * 0.05 };
  const collarR = { x: shoulderMid.x + shoulderWidth * 0.12, y: neckY + torsoHeight * 0.05 };
  const outerL = { x: sl.x - pad, y: sl.y + torsoHeight * 0.03 };
  const outerR = { x: sr.x + pad, y: sr.y + torsoHeight * 0.03 };
  const hemL = { x: hl.x - hipWidth * 0.42, y: hl.y + torsoHeight * 0.22 };
  const hemR = { x: hr.x + hipWidth * 0.42, y: hr.y + torsoHeight * 0.22 };

  const grad = ctx.createLinearGradient(sl.x, sl.y, hr.x, hr.y + torsoHeight * 0.18);
  grad.addColorStop(0, lighten(color, 34));
  grad.addColorStop(0.42, color);
  grad.addColorStop(1, darken(color, 20));

  drawSleeve(ctx, product, sl, le, lw, shoulderWidth * 0.15, sleeve, grad, accent);
  drawSleeve(ctx, product, sr, re, rw, shoulderWidth * 0.15, sleeve, grad, accent);

  ctx.beginPath();
  ctx.moveTo(outerL.x, outerL.y);
  ctx.quadraticCurveTo(collarL.x - shoulderWidth * 0.1, neckY, collarL.x, collarL.y);
  ctx.quadraticCurveTo(shoulderMid.x, neckY + torsoHeight * 0.11, collarR.x, collarR.y);
  ctx.quadraticCurveTo(collarR.x + shoulderWidth * 0.1, neckY, outerR.x, outerR.y);
  ctx.bezierCurveTo(sr.x + pad * 0.75, sr.y + torsoHeight * 0.3, hemR.x, hemR.y - torsoHeight * 0.18, hemR.x, hemR.y);
  ctx.quadraticCurveTo(hipMid.x, hemR.y + torsoHeight * 0.07, hemL.x, hemL.y);
  ctx.bezierCurveTo(hemL.x, hemL.y - torsoHeight * 0.18, sl.x - pad * 0.75, sl.y + torsoHeight * 0.3, outerL.x, outerL.y);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.save();
  ctx.clip();
  drawFabricTexture(ctx, product, shoulderMid, hipMid, shoulderWidth, torsoHeight, width);
  ctx.restore();

  ctx.strokeStyle = withAlpha("#ffffff", 0.42);
  ctx.lineWidth = Math.max(1.4, width * 0.002);
  ctx.stroke();

  ctx.shadowBlur = 0;
  drawTopDetails(ctx, product, { sl, sr, hl, hr, shoulderMid, hipMid, collarL, collarR, hemL, hemR }, shoulderWidth, torsoHeight, width);
}

function drawSleeve(ctx, product, shoulder, elbow, wrist, width, sleeve, fillStyle, accent) {
  const end = sleeve > 0.92 ? wrist : pointBetween(shoulder, elbow, sleeve);
  const cuff = Math.max(5, width * 0.42);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = fillStyle;
  ctx.lineWidth = Math.max(16, width * 1.9);
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y + width * 0.12);
  ctx.quadraticCurveTo(elbow.x, elbow.y, end.x, end.y);
  ctx.stroke();

  ctx.strokeStyle = withAlpha("#ffffff", 0.24);
  ctx.lineWidth = Math.max(2, width * 0.16);
  ctx.beginPath();
  ctx.moveTo(shoulder.x + (end.x < shoulder.x ? -width * 0.18 : width * 0.18), shoulder.y + width * 0.3);
  ctx.quadraticCurveTo(elbow.x, elbow.y, end.x, end.y - cuff);
  ctx.stroke();

  ctx.strokeStyle = withAlpha(accent, product.type === "sport" ? 0.92 : 0.55);
  ctx.lineWidth = Math.max(2, width * 0.18);
  ctx.beginPath();
  ctx.moveTo(end.x - width * 0.28, end.y);
  ctx.lineTo(end.x + width * 0.28, end.y);
  ctx.stroke();
  ctx.restore();
}

function drawTopDetails(ctx, product, points, shoulderWidth, torsoHeight, width) {
  const { shoulderMid, hipMid, collarL, collarR, hemL, hemR } = points;
  const accent = product.accent;
  const centerBottom = pointBetween(shoulderMid, hipMid, 1.12);

  ctx.strokeStyle = withAlpha(accent, 0.88);
  ctx.lineWidth = Math.max(3, shoulderWidth * 0.017);
  ctx.beginPath();
  ctx.moveTo(shoulderMid.x, collarL.y + torsoHeight * 0.04);
  ctx.lineTo(centerBottom.x, centerBottom.y);
  ctx.stroke();

  ctx.fillStyle = withAlpha("#ffffff", product.type === "suit" ? 0.9 : 0.72);
  ctx.beginPath();
  ctx.moveTo(collarL.x, collarL.y);
  ctx.lineTo(shoulderMid.x, collarL.y + torsoHeight * 0.13);
  ctx.lineTo(collarR.x, collarR.y);
  ctx.quadraticCurveTo(shoulderMid.x, collarL.y + torsoHeight * 0.18, collarL.x, collarL.y);
  ctx.fill();

  if (product.type === "suit") {
    ctx.fillStyle = withAlpha("#ffffff", 0.86);
    ctx.beginPath();
    ctx.moveTo(shoulderMid.x - shoulderWidth * 0.03, collarL.y + torsoHeight * 0.04);
    ctx.lineTo(shoulderMid.x - shoulderWidth * 0.22, collarL.y + torsoHeight * 0.34);
    ctx.lineTo(shoulderMid.x - shoulderWidth * 0.02, collarL.y + torsoHeight * 0.48);
    ctx.lineTo(shoulderMid.x + shoulderWidth * 0.2, collarL.y + torsoHeight * 0.34);
    ctx.closePath();
    ctx.fill();
  } else if (product.type === "jacket") {
    ctx.strokeStyle = withAlpha("#ffffff", 0.5);
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.beginPath();
    ctx.moveTo(collarL.x - shoulderWidth * 0.08, collarL.y + torsoHeight * 0.08);
    ctx.quadraticCurveTo(hemL.x + shoulderWidth * 0.12, collarL.y + torsoHeight * 0.42, hemL.x + shoulderWidth * 0.22, hemL.y - torsoHeight * 0.08);
    ctx.moveTo(collarR.x + shoulderWidth * 0.08, collarR.y + torsoHeight * 0.08);
    ctx.quadraticCurveTo(hemR.x - shoulderWidth * 0.12, collarR.y + torsoHeight * 0.42, hemR.x - shoulderWidth * 0.22, hemR.y - torsoHeight * 0.08);
    ctx.stroke();
  } else if (product.type === "shirt") {
    ctx.fillStyle = withAlpha("#ffffff", 0.22);
    roundRect(ctx, shoulderMid.x - shoulderWidth * 0.09, collarL.y + torsoHeight * 0.2, shoulderWidth * 0.18, torsoHeight * 0.18, 6);
    ctx.fill();
  }

  ctx.fillStyle = withAlpha(accent, 0.85);
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(shoulderMid.x, collarL.y + torsoHeight * (0.24 + i * 0.16), Math.max(2, width * 0.002), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFabricTexture(ctx, product, shoulderMid, hipMid, shoulderWidth, torsoHeight, width) {
  ctx.strokeStyle = withAlpha("#ffffff", 0.35);
  ctx.lineWidth = Math.max(1, width * 0.0015);
  for (let i = 0; i < 6; i += 1) {
    const offset = (i - 2.5) * shoulderWidth * 0.13;
    const x = shoulderMid.x + offset;
    ctx.beginPath();
    ctx.moveTo(x, shoulderMid.y + torsoHeight * 0.2);
    ctx.quadraticCurveTo(x + Math.sin(i + 1) * shoulderWidth * 0.02, shoulderMid.y + torsoHeight * 0.48, x - shoulderWidth * 0.02, hipMid.y + torsoHeight * 0.12);
    ctx.stroke();
  }

  if (product.type === "sport") {
    ctx.strokeStyle = withAlpha(product.accent, 0.38);
    ctx.lineWidth = Math.max(5, shoulderWidth * 0.018);
    ctx.beginPath();
    ctx.moveTo(shoulderMid.x - shoulderWidth * 0.42, shoulderMid.y + torsoHeight * 0.26);
    ctx.lineTo(shoulderMid.x + shoulderWidth * 0.42, shoulderMid.y + torsoHeight * 0.26);
    ctx.stroke();
  }
}

function drawLiveDress(ctx, product, anchors, width, height) {
  drawLiveTop(ctx, { ...product, type: "shirt" }, anchors, width, height);
  const hl = anchors.leftHip;
  const hr = anchors.rightHip;
  const lk = anchors.leftKnee;
  const rk = anchors.rightKnee;
  const hipWidth = distance(hl, hr);
  const centerTop = mid(hl, hr);
  const centerBottom = mid(lk, rk);
  const grad = ctx.createLinearGradient(centerTop.x, centerTop.y, centerBottom.x, centerBottom.y);
  grad.addColorStop(0, product.color);
  grad.addColorStop(1, darken(product.color, 22));
  ctx.fillStyle = grad;
  ctx.strokeStyle = withAlpha(product.accent, 0.55);
  ctx.lineWidth = Math.max(2, width * 0.002);
  ctx.beginPath();
  ctx.moveTo(hl.x - hipWidth * 0.18, hl.y - hipWidth * 0.08);
  ctx.lineTo(hr.x + hipWidth * 0.18, hr.y - hipWidth * 0.08);
  ctx.lineTo(rk.x + hipWidth * 0.62, rk.y + height * 0.03);
  ctx.quadraticCurveTo(centerBottom.x, rk.y + height * 0.07, lk.x - hipWidth * 0.62, lk.y + height * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawLivePants(ctx, product, anchors, width, height) {
  const hl = anchors.leftHip;
  const hr = anchors.rightHip;
  const lk = anchors.leftKnee;
  const rk = anchors.rightKnee;
  const la = anchors.leftAnkle;
  const ra = anchors.rightAnkle;
  const hipWidth = distance(hl, hr);
  const grad = ctx.createLinearGradient(hl.x, hl.y, ra.x, ra.y);
  grad.addColorStop(0, lighten(product.color, 18));
  grad.addColorStop(1, darken(product.color, 16));
  ctx.fillStyle = grad;
  ctx.strokeStyle = withAlpha("#ffffff", 0.28);
  ctx.lineWidth = Math.max(1, width * 0.002);

  drawLeg(ctx, hl, lk, la, hipWidth * 0.24, grad);
  drawLeg(ctx, hr, rk, ra, hipWidth * 0.24, grad);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = withAlpha(product.accent, 0.74);
  ctx.lineWidth = Math.max(2, width * 0.0025);
  ctx.beginPath();
  ctx.moveTo(hl.x, hl.y);
  ctx.lineTo(hr.x, hr.y);
  ctx.stroke();
}

function drawLeg(ctx, hip, knee, ankle, w, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(hip.x - w, hip.y);
  ctx.quadraticCurveTo(knee.x - w * 0.56, knee.y, ankle.x - w * 0.36, ankle.y);
  ctx.lineTo(ankle.x + w * 0.36, ankle.y);
  ctx.quadraticCurveTo(knee.x + w * 0.56, knee.y, hip.x + w, hip.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawLiveShoes(ctx, product, anchors, width) {
  const shoeW = Math.max(distance(anchors.leftShoulder, anchors.rightShoulder) * 0.26, width * 0.09);
  [anchors.leftAnkle, anchors.rightAnkle].forEach((ankle, index) => {
    const direction = index === 0 ? -1 : 1;
    ctx.fillStyle = product.color;
    ctx.strokeStyle = withAlpha(product.accent, 0.92);
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.beginPath();
    ctx.ellipse(ankle.x + direction * shoeW * 0.22, ankle.y + shoeW * 0.14, shoeW * 0.62, shoeW * 0.22, direction * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawLiveGlasses(ctx, product, anchors, width) {
  if (!anchors.tracked && el.photoPreview.classList.contains("visible")) {
    setTracking("Face not detected");
    return;
  }

  const nose = anchors.nose;
  const shoulderW = distance(anchors.leftShoulder, anchors.rightShoulder);
  const eyeA = anchors.leftEye || anchors.leftEyeInner || anchors.leftEyeOuter;
  const eyeB = anchors.rightEye || anchors.rightEyeInner || anchors.rightEyeOuter;
  const eyeCenter = eyeA && eyeB ? mid(eyeA, eyeB) : { x: nose.x, y: nose.y - shoulderW * 0.12 };
  const eyeDistance = eyeA && eyeB ? distance(eyeA, eyeB) : shoulderW * 0.18;
  const earWidth = anchors.leftEar && anchors.rightEar ? distance(anchors.leftEar, anchors.rightEar) : 0;
  const rawW = Math.max(eyeDistance * 2.35, earWidth * 0.62, shoulderW * 0.3);
  const glassesW = Math.min(Math.max(rawW, width * 0.085), width * 0.22);
  const lensW = glassesW * 0.34;
  const lensH = glassesW * 0.2;
  const x = eyeCenter.x;
  const y = Math.min(eyeCenter.y, nose.y - lensH * 0.35);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = product.color;
  ctx.lineWidth = Math.max(4, glassesW * 0.05);
  ctx.beginPath();
  ctx.roundRect(x - glassesW * 0.44, y - lensH / 2, lensW, lensH, lensH * 0.42);
  ctx.roundRect(x + glassesW * 0.1, y - lensH / 2, lensW, lensH, lensH * 0.42);
  ctx.moveTo(x - glassesW * 0.1, y);
  ctx.quadraticCurveTo(x, y - lensH * 0.18, x + glassesW * 0.1, y);
  ctx.stroke();
  ctx.fillStyle = withAlpha(product.accent, 0.18);
  ctx.fill();
  ctx.strokeStyle = withAlpha("#ffffff", 0.42);
  ctx.lineWidth = Math.max(1.2, glassesW * 0.012);
  ctx.beginPath();
  ctx.moveTo(x - glassesW * 0.38, y - lensH * 0.18);
  ctx.lineTo(x - glassesW * 0.22, y - lensH * 0.18);
  ctx.moveTo(x + glassesW * 0.22, y - lensH * 0.18);
  ctx.lineTo(x + glassesW * 0.38, y - lensH * 0.18);
  ctx.stroke();
}

function drawLiveWatch(ctx, product, anchors, width) {
  const wrist = anchors.rightWrist || anchors.leftWrist;
  const shoulderW = distance(anchors.leftShoulder, anchors.rightShoulder);
  const r = Math.max(shoulderW * 0.06, width * 0.018);
  ctx.shadowBlur = Math.max(6, r);
  ctx.fillStyle = product.color;
  ctx.beginPath();
  ctx.arc(wrist.x, wrist.y, r * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(wrist.x, wrist.y, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = product.accent;
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.beginPath();
  ctx.moveTo(wrist.x, wrist.y);
  ctx.lineTo(wrist.x + r * 0.44, wrist.y - r * 0.4);
  ctx.moveTo(wrist.x, wrist.y);
  ctx.lineTo(wrist.x, wrist.y + r * 0.55);
  ctx.stroke();
}

function drawLiveHat(ctx, product, anchors, width) {
  const nose = anchors.nose;
  const shoulderW = distance(anchors.leftShoulder, anchors.rightShoulder);
  const hatW = Math.max(shoulderW * 0.58, width * 0.18);
  const y = nose.y - hatW * 0.5;
  ctx.fillStyle = product.color;
  ctx.strokeStyle = withAlpha(product.accent, 0.82);
  ctx.lineWidth = Math.max(2, width * 0.002);
  ctx.beginPath();
  ctx.ellipse(nose.x, y + hatW * 0.22, hatW * 0.52, hatW * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nose.x - hatW * 0.34, y + hatW * 0.14);
  ctx.quadraticCurveTo(nose.x - hatW * 0.16, y - hatW * 0.24, nose.x + hatW * 0.28, y - hatW * 0.16);
  ctx.quadraticCurveTo(nose.x + hatW * 0.42, y, nose.x + hatW * 0.32, y + hatW * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCompareGuide(ctx, width, height) {
  const x = width * state.compare;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  ctx.fillStyle = "rgba(12,13,16,0.82)";
  roundRect(ctx, x - 56, 18, 112, 32, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Before | After", x, 39);
  ctx.restore();
}

function drawTrackingDots(ctx, anchors) {
  if (!anchors.tracked) return;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(53, 242, 184, 0.82)";
  [
    anchors.leftShoulder,
    anchors.rightShoulder,
    anchors.leftHip,
    anchors.rightHip,
    anchors.leftWrist,
    anchors.rightWrist,
    anchors.leftAnkle,
    anchors.rightAnkle
  ].filter(Boolean).forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

async function recommendSize() {
  try {
    const response = await fetch("/api/size-recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height: el.heightInput.value,
        weight: el.weightInput.value,
        shape: el.shapeInput.value
      })
    });
    const data = await response.json();
    el.sizeBadge.textContent = data.size;
    el.sizeResult.innerHTML = `
      <div class="metric-row"><span>Confidence</span><strong>${Math.round(data.confidence * 100)}%</strong></div>
      <div class="metric-row"><span>Chest</span><strong>${data.measurements.chest} cm</strong></div>
      <div class="metric-row"><span>Waist</span><strong>${data.measurements.waist} cm</strong></div>
      <div class="metric-row"><span>Inseam</span><strong>${data.measurements.inseam} cm</strong></div>
      <div class="ai-message"><p>${data.notes.join(" ")}</p></div>
    `;
  } catch (error) {
    console.error(error);
    el.sizeResult.innerHTML = `<div class="ai-message"><p>Size modeli hozir javob bermadi.</p></div>`;
  }
}

async function askStylist(animateOutput) {
  if (!state.selected || !el.stylistOutput) return;
  if (animateOutput) {
    el.stylistOutput.innerHTML = `<div class="ai-message"><strong>AI Stylist</strong><p>Outfit hisoblanmoqda...</p></div>`;
  }
  try {
    const response = await fetch("/api/stylist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedId: state.selected.id,
        favorites: [...state.favorites],
        occasion: el.occasionInput?.value || "daily",
        weather: el.weatherInput?.value || "mild"
      })
    });
    const data = await response.json();
    el.stylistOutput.innerHTML = `
      <div class="ai-message">
        <strong>${data.headline} · ${data.styleScore}/100</strong>
        <p>${data.advice}</p>
        <div class="chip-row">
          ${data.outfit.map(item => `
            <button class="outfit-chip" type="button" data-outfit-id="${item.id}">
              <span class="swatch" style="background:${item.color}"></span>
              <span>${item.name}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
    el.stylistOutput.querySelectorAll("[data-outfit-id]").forEach(button => {
      button.addEventListener("click", () => selectProduct(button.dataset.outfitId));
    });
  } catch (error) {
    console.error(error);
    el.stylistOutput.innerHTML = `<div class="ai-message"><p>AI Stylist javob bermadi.</p></div>`;
  }
}

async function loadTrends() {
  try {
    const response = await fetch("/api/trends");
    const data = await response.json();
    el.trendList.innerHTML = data.trends.map(trend => `
      <div class="trend-item">
        <div>
          <strong>${trend.title}</strong>
          <span>${trend.signal}</span>
        </div>
        <span class="trend-score">${trend.score}</span>
      </div>
    `).join("");
  } catch (error) {
    console.error(error);
  }
}

function toggleFavorite(id) {
  if (!id) return;
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  localStorage.setItem("fitvision:favorites", JSON.stringify([...state.favorites]));
  el.favoriteBtn.classList.toggle("active", state.favorites.has(id));
  renderFavorites();
  fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: id, active: state.favorites.has(id) })
  }).catch(() => {});
}

function renderFavorites() {
  const items = state.products.filter(product => state.favorites.has(product.id));
  el.favoriteCount.textContent = String(items.length);
  if (!items.length) {
    el.favoriteList.innerHTML = `<div class="ai-message"><p>Sevimli outfitlar shu yerda ko'rinadi.</p></div>`;
    return;
  }
  el.favoriteList.innerHTML = items.map(item => `
    <button class="favorite-item" type="button" data-favorite-id="${item.id}">
      <span class="swatch" style="background:${item.color}"></span>
      <span>
        <strong>${item.name}</strong>
        <span>${item.category} · $${item.price}</span>
      </span>
      <i data-lucide="chevron-right"></i>
    </button>
  `).join("");
  el.favoriteList.querySelectorAll("[data-favorite-id]").forEach(button => {
    button.addEventListener("click", () => selectProduct(button.dataset.favoriteId));
  });
  refreshIcons();
}

async function saveLook() {
  const blob = await createLookBlob();
  if (!blob) {
    setTracking("No frame");
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fitvision-${Date.now()}.png`;
  link.click();
  URL.revokeObjectURL(url);
  setTracking("Look saved");
}

async function shareLook() {
  const blob = await createLookBlob();
  const shareData = {
    title: "FitVision AI Look",
    text: `${state.selected?.name || "FitVision"} virtual try-on`
  };

  try {
    if (blob && navigator.canShare) {
      const file = new File([blob], "fitvision-look.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
        return;
      }
    }
    if (navigator.share) {
      await navigator.share({ ...shareData, url: location.href });
      return;
    }
    await navigator.clipboard?.writeText(location.href);
    setTracking("Link copied");
  } catch (error) {
    console.warn(error);
  }
}

async function createLookBlob() {
  const base = getActiveMedia();
  if (!base) return null;
  const stageRect = el.stage.getBoundingClientRect();
  const width = Math.round(stageRect.width * 1.5);
  const height = Math.round(stageRect.height * 1.5);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const fit = base === el.photoPreview && el.photoPreview.classList.contains("visible") ? "contain" : "cover";
  drawMediaCover(ctx, base, width, height, state.mirror, fit);
  drawTryOn(ctx, width, height, true);
  ctx.fillStyle = "rgba(12, 13, 16, 0.72)";
  roundRect(ctx, width - 210, height - 52, 184, 34, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FITVISION AI", width - 118, height - 29);
  return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.94));
}

function getActiveMedia() {
  if (el.photoPreview.classList.contains("visible") && el.photoPreview.complete) return el.photoPreview;
  if (state.stream && el.cameraFeed.readyState >= 2) return el.cameraFeed;
  return null;
}

function drawMediaCover(ctx, source, width, height, mirror, fit = "cover") {
  const sourceW = source.videoWidth || source.naturalWidth || width;
  const sourceH = source.videoHeight || source.naturalHeight || height;
  const scale = fit === "contain"
    ? Math.min(width / sourceW, height / sourceH)
    : Math.max(width / sourceW, height / sourceH);
  const drawW = sourceW * scale;
  const drawH = sourceH * scale;
  const x = (width - drawW) / 2;
  const y = (height - drawH) / 2;
  if (fit === "contain") {
    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.save();
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, x, y, drawW, drawH);
  } else {
    ctx.drawImage(source, x, y, drawW, drawH);
  }
  ctx.restore();
}

async function startVoiceCommand() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const fallback = window.prompt("Masalan: red jacket ko'rsat");
    if (fallback) handleVoiceText(fallback);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "uz-UZ";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  setTracking("Listening...");
  recognition.addEventListener("result", event => {
    const text = event.results[0]?.[0]?.transcript || "";
    handleVoiceText(text);
  });
  recognition.addEventListener("error", () => setTracking("Voice unavailable"));
  recognition.start();
}

async function handleVoiceText(text) {
  try {
    const response = await fetch("/api/voice-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    selectProduct(data.productId);
    setTracking(data.message);
  } catch (error) {
    console.error(error);
    setTracking("Voice failed");
  }
}

function initThreeScene() {
  if (!window.THREE || !el.miniScene) {
    renderFallbackScene();
    return;
  }

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101114);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 1.1, 6.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.miniScene.innerHTML = "";
  el.miniScene.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x0b1320, 1.6);
  scene.add(light);
  const key = new THREE.DirectionalLight(0x35f2b8, 1.2);
  key.position.set(4, 5, 4);
  scene.add(key);

  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8d7c8, roughness: 0.55 });
  const garment = new THREE.MeshStandardMaterial({ color: state.selected?.color || 0x0b74ff, roughness: 0.35, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.42 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.78, 1.45, 8, 20), garment);
  torso.position.y = 0.5;
  torso.scale.set(0.72, 1, 0.32);
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20), skin);
  head.position.y = 1.72;
  group.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.22, 20), skin);
  neck.position.y = 1.32;
  group.add(neck);

  [-0.74, 0.74].forEach(x => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 1.1, 8, 16), garment);
    arm.position.set(x, 0.48, 0);
    arm.rotation.z = x > 0 ? -0.2 : 0.2;
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.25, 8, 16), dark);
    leg.position.set(x * 0.24, -1.15, 0);
    group.add(leg);
  });

  const floor = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 1.48, 80),
    new THREE.MeshBasicMaterial({ color: 0x35f2b8, transparent: true, opacity: 0.65 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.86;
  group.add(floor);

  scene.add(group);
  state.three = { scene, camera, renderer, group, garment };
  resizeThree();

  const tick = () => {
    if (!state.three) return;
    group.rotation.y += 0.009;
    floor.rotation.z -= 0.016;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
}

function resizeThree() {
  if (!state.three || !el.miniScene) return;
  const rect = el.miniScene.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  state.three.camera.aspect = width / height;
  state.three.camera.updateProjectionMatrix();
  state.three.renderer.setSize(width, height, false);
}

function updateThreeProduct() {
  if (state.three?.garment && state.selected && window.THREE) {
    state.three.garment.color.set(state.selected.color);
  } else if (state.fallbackScenePaint) {
    state.fallbackScenePaint();
  }
}

function renderFallbackScene() {
  const canvas = document.createElement("canvas");
  el.miniScene.innerHTML = "";
  el.miniScene.appendChild(canvas);
  const paint = () => {
    const { ctx, width, height } = setupCanvas(canvas);
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = "rgba(53,242,184,0.82)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, height * 0.82, width * 0.25, height * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = state.selected?.color || "#0b74ff";
    roundRect(ctx, cx - width * 0.14, cy - height * 0.12, width * 0.28, height * 0.42, 8);
    ctx.fill();
    ctx.fillStyle = "#e8d7c8";
    ctx.beginPath();
    ctx.arc(cx, cy - height * 0.25, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
  };
  state.fallbackScenePaint = paint;
  paint();
  window.addEventListener("resize", paint);
}

async function checkBackend() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    if (data.ok) setTracking("Backend online");
  } catch (error) {
    console.error(error);
  }
}

function setTracking(text) {
  if (el.trackingText && el.trackingText.textContent !== text) {
    el.trackingText.textContent = text;
  }
}

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || canvas.parentElement?.clientWidth || 300));
  const height = Math.max(1, Math.round(rect.height || canvas.parentElement?.clientHeight || 180));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function roundRect(ctx, x, y, width, height, radius) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function distance(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointBetween(a, b, ratio) {
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}

function withAlpha(color, alpha) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lighten(color, amount) {
  const { r, g, b } = hexToRgb(color);
  return rgbToHex(
    Math.min(255, r + amount),
    Math.min(255, g + amount),
    Math.min(255, b + amount)
  );
}

function darken(color, amount) {
  const { r, g, b } = hexToRgb(color);
  return rgbToHex(
    Math.max(0, r - amount),
    Math.max(0, g - amount),
    Math.max(0, b - amount)
  );
}

function hexToRgb(color) {
  const normalized = color.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map(char => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(value => value.toString(16).padStart(2, "0")).join("")}`;
}
