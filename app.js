const states = [
  { name: "Lagos", center: [6.5244, 3.3792], areas: ["Ikeja", "Lekki", "Yaba", "Surulere", "Ajah"] },
  { name: "Abuja/FCT", center: [9.0765, 7.3986], areas: ["Wuse", "Garki", "Maitama", "Gwarinpa", "Lugbe"] },
  { name: "Edo", center: [6.335, 5.6037], areas: ["Benin City", "Ekpoma", "Auchi", "Uromi"] },
  { name: "Ogun", center: [7.1608, 3.3483], areas: ["Abeokuta", "Sango Ota", "Ijebu Ode", "Sagamu"] },
  { name: "Delta", center: [5.704, 5.9339], areas: ["Warri", "Asaba", "Sapele", "Ughelli"] },
  { name: "Rivers", center: [4.8156, 7.0498], areas: ["Port Harcourt", "Obio-Akpor", "Bonny", "Eleme"] },
];

const defaultServiceCategories = [
  ["Electrician", "Power, wiring, repairs", ["House wiring", "Fault tracing", "Inverter setup"]],
  ["Plumber", "Leaks, fittings, water systems", ["Leak repair", "Pipe fitting", "Pump setup"]],
  ["Tailor", "Fashion, uniforms, alterations", ["Native wear", "Alterations", "Uniforms"]],
  ["Mechanic", "Vehicle repair and diagnostics", ["Diagnostics", "Engine service", "Brake repair"]],
  ["AC Technician", "Cooling, servicing, installation", ["AC servicing", "Gas refill", "Installation"]],
  ["Carpenter", "Furniture, fittings, woodwork", ["Cabinets", "Doors", "Furniture repair"]],
  ["Painter", "Homes, offices, finishing", ["Interior finish", "Exterior painting", "Wall prep"]],
  ["Solar Installer", "Inverters, panels, batteries", ["Panel setup", "Battery wiring", "Load audit"]],
  ["IT Technician", "Computers, networks, CCTV, printers", ["Laptop repair", "Network setup", "CCTV support"]],
];

let categories = defaultServiceCategories.map(([name, description, skills]) => ({ name, description, skills }));

const demoArtisans = [
  ["Lagos", "Ikeja", "Electrician", "Tunde Bright Electricals", 6.6018, 3.3515, 4.9, 22, "12 min", "Verified"],
  ["Lagos", "Lekki", "AC Technician", "Kemi CoolFix Services", 6.4698, 3.5852, 4.8, 18, "18 min", "Pro"],
  ["Lagos", "Yaba", "Tailor", "Ayo Urban Stitches", 6.5145, 3.3896, 4.7, 31, "20 min", "Verified"],
  ["Abuja/FCT", "Wuse", "Plumber", "Musa FlowMaster", 9.0833, 7.4667, 4.9, 27, "15 min", "Verified"],
  ["Abuja/FCT", "Gwarinpa", "Solar Installer", "NorthLight Solar Works", 9.1099, 7.4042, 4.8, 16, "24 min", "Pro"],
  ["Abuja/FCT", "Garki", "Painter", "FCT Prime Finishers", 9.0339, 7.4898, 4.6, 20, "21 min", "Basic"],
  ["Edo", "Benin City", "Carpenter", "Osas FineWood Studio", 6.3349, 5.6037, 4.9, 34, "17 min", "Verified"],
  ["Edo", "Auchi", "Mechanic", "Ibrahim AutoCare", 7.0676, 6.2636, 4.7, 19, "29 min", "Verified"],
  ["Edo", "Ekpoma", "Tailor", "Grace Fit & Sew", 6.742, 6.139, 4.8, 25, "25 min", "Pro"],
  ["Ogun", "Abeokuta", "Plumber", "RockCity Pipe Works", 7.1475, 3.3619, 4.7, 15, "19 min", "Verified"],
  ["Ogun", "Sango Ota", "Electrician", "Ota Smart Wiring", 6.6899, 3.232, 4.8, 29, "16 min", "Pro"],
  ["Ogun", "Sagamu", "Painter", "Remo Finish Crew", 6.8322, 3.6319, 4.5, 11, "33 min", "Basic"],
  ["Delta", "Warri", "Mechanic", "Efe Rapid Motors", 5.5167, 5.75, 4.9, 41, "14 min", "Pro"],
  ["Delta", "Asaba", "Electrician", "Nedu PowerCare", 6.1985, 6.7319, 4.8, 26, "22 min", "Verified"],
  ["Delta", "Sapele", "Carpenter", "Delta Woodline", 5.8941, 5.6767, 4.6, 13, "35 min", "Basic"],
  ["Rivers", "Port Harcourt", "AC Technician", "PH CoolRoom Experts", 4.8156, 7.0498, 4.9, 37, "13 min", "Pro"],
  ["Rivers", "Obio-Akpor", "Plumber", "Rivers LeakStop", 4.8678, 7.012, 4.8, 23, "20 min", "Verified"],
  ["Rivers", "Eleme", "Solar Installer", "GreenPort Energy", 4.7857, 7.1206, 4.7, 17, "28 min", "Verified"],
].map(([state, area, category, name, lat, lng, rating, jobs, response, plan], index) => ({
  id: index + 1,
  state,
  area,
  category,
  name,
  lat,
  lng,
  rating,
  jobs,
  response,
  plan,
  subscriptionStatus: "active",
  initials: name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join(""),
  bio: `${name} is a ${plan.toLowerCase()} ${category.toLowerCase()} serving ${area} and nearby communities with verified FixAm 9ja marketplace signals.`,
  skills: serviceSkills(category),
  availability: index % 3 === 0 ? "Available today" : index % 3 === 1 ? "Available this week" : "Taking scheduled jobs",
  radius: 8 + (index % 5) * 3,
  completed: jobs + 14 + index,
  verification: ["Phone checked", "Location checked", plan === "Basic" ? "Profile reviewed" : "ID reviewed"],
  portfolio: portfolioFor(category),
}));

let artisans = [...demoArtisans];
let qoreIdRestoreTimer = null;

function serviceSkills(category) {
  const service = categories.find((item) => item.name.toLowerCase() === String(category).toLowerCase());
  if (service?.skills?.length) return service.skills;

  const skills = {
    Electrician: ["House wiring", "Fault tracing", "Inverter setup"],
    "AC Technician": ["AC servicing", "Gas refill", "Installation"],
    Tailor: ["Native wear", "Alterations", "Uniforms"],
    "Tailor/Fashion designer": ["Native wear", "Alterations", "Uniforms"],
    Plumber: ["Leak repair", "Pipe fitting", "Pump setup"],
    "Solar Installer": ["Panel setup", "Battery wiring", "Load audit"],
    Painter: ["Interior finish", "Exterior painting", "Wall prep"],
    Carpenter: ["Cabinets", "Doors", "Furniture repair"],
    Mechanic: ["Diagnostics", "Engine service", "Brake repair"],
    "IT Technician": ["Laptop repair", "Network setup", "CCTV support"],
  };
  return skills[category] || ["Inspection", "Repairs", "Installation"];
}

function portfolioFor(category) {
  return [`${category} inspection`, "Completed customer job", "Tools and work setup"];
}

const originByState = Object.fromEntries(states.map((state) => [state.name, state.center]));
const defaultStateName = "Lagos";
const stateStorageKey = "fixam9ja.selectedState";
const areaStorageKey = "fixam9ja.selectedArea";
const foundingLaunchFree = true;
let activeOrigin = originByState[defaultStateName];
let activeOriginLabel = null;
let markers = [];
let userMarker = null;
let reviewStatsByArtisanId = new Map();
let qualityByArtisanId = new Map();
const artisanIcon = L.divIcon({
  className: "map-pin",
  html: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const stateFilter = document.querySelector("#stateFilter");
const areaFilter = document.querySelector("#areaFilter");
const serviceSearch = document.querySelector("#serviceSearch");
const sortFilter = document.querySelector("#sortFilter");
const categoryGrid = document.querySelector("#categoryGrid");
const artisanList = document.querySelector("#artisanList");
const resultCount = document.querySelector("#resultCount");
const activeRegion = document.querySelector("#activeRegion");
const mapStatus = document.querySelector("#mapStatus");
const profileModal = document.querySelector("#profileModal");
const quoteModal = document.querySelector("#quoteModal");
const profileContent = document.querySelector("#profileContent");
const quoteForm = document.querySelector("#quoteForm");
const quoteArtisanText = document.querySelector("#quoteArtisanText");
const quoteNote = document.querySelector("#quoteNote");
const quoteSubmitButton = quoteForm.querySelector("button[type='submit']");
const joinForm = document.querySelector("#joinForm");
const joinTrade = document.querySelector("#joinTrade");
const joinState = document.querySelector("#joinState");
const joinArea = document.querySelector("#joinArea");
const joinNote = document.querySelector("#joinNote");
const joinSubmitButton = joinForm.querySelector("button[type='submit']");
let selectedQuoteArtisan = null;

const supabaseSettings = window.FIXAM_SUPABASE || {};
const supabaseClient =
  window.supabase && supabaseSettings.url && supabaseSettings.anonKey
    ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey)
    : null;

states.forEach((state) => {
  stateFilter.add(new Option(state.name, state.name));
  joinState.add(new Option(state.name, state.name));
});

stateFilter.value = savedStateName();
joinState.value = stateFilter.value;

document.querySelector("#stateGrid").innerHTML = states
  .map(
    (state) => `
      <article class="state-card">
        <h3>${state.name}</h3>
        <p>${state.areas.join(", ")} and nearby communities.</p>
        <button type="button" data-state="${state.name}">Explore ${state.name}</button>
      </article>
    `,
  )
  .join("");

renderServiceCatalog();
renderJoinTradeOptions();

const map = L.map("map", { scrollWheelZoom: false }).setView(originByState[stateFilter.value], 11);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

function milesBetween([lat1, lon1], [lat2, lon2]) {
  const radius = 3958.8;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function syncAreas() {
  const selected = states.find((state) => state.name === stateFilter.value);
  const selectedArea = areaFilter.value || savedAreaName(selected.name);
  areaFilter.innerHTML = "";
  areaFilter.add(new Option("All areas", "All"));
  selected.areas.forEach((area) => areaFilter.add(new Option(area, area)));
  areaFilter.value = selected.areas.includes(selectedArea) ? selectedArea : "All";
  activeOrigin = selected.center;
  activeOriginLabel = null;
  saveStateName(selected.name);
  saveAreaName(areaFilter.value);
}

function syncJoinAreas() {
  const selected = states.find((state) => state.name === joinState.value);
  joinArea.innerHTML = "";
  selected.areas.forEach((area) => joinArea.add(new Option(area, area)));
}

function renderServiceCatalog() {
  categoryGrid.innerHTML = categories
    .map(
      ({ name, description }) => `
        <article class="category-card">
          <span class="category-icon">${escapeHtml(name.slice(0, 2))}</span>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(description)}</p>
        </article>
      `,
    )
    .join("");
}

function renderJoinTradeOptions() {
  const selectedTrade = joinTrade.value;
  joinTrade.innerHTML = "";
  categories.forEach(({ name }) => joinTrade.add(new Option(name, name)));
  if (categories.some(({ name }) => name === selectedTrade)) joinTrade.value = selectedTrade;
}

async function loadServiceCategories() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("service_categories")
    .select("name, description, skills")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data?.length) return;

  categories = data.map((service) => ({
    name: service.name,
    description: service.description,
    skills: Array.isArray(service.skills) ? service.skills : [],
  }));
  renderServiceCatalog();
  renderJoinTradeOptions();
}

function savedStateName() {
  try {
    const saved = localStorage.getItem(stateStorageKey);
    return states.some((state) => state.name === saved) ? saved : defaultStateName;
  } catch {
    return defaultStateName;
  }
}

function savedAreaName(stateName) {
  try {
    const saved = localStorage.getItem(areaStorageKey);
    const state = states.find((item) => item.name === stateName);
    return state?.areas.includes(saved) ? saved : "All";
  } catch {
    return "All";
  }
}

function saveStateName(stateName) {
  if (!states.some((state) => state.name === stateName)) return;
  try {
    localStorage.setItem(stateStorageKey, stateName);
  } catch {
    // Some browsers block storage in strict privacy modes. The page still works for the current visit.
  }
}

function saveAreaName(areaName) {
  try {
    localStorage.setItem(areaStorageKey, areaName || "All");
  } catch {
    // Some browsers block storage in strict privacy modes. The page still works for the current visit.
  }
}

function filteredArtisans() {
  const query = serviceSearch.value.trim().toLowerCase();
  const selectedState = stateFilter.value;
  const selectedArea = areaFilter.value;

  return artisans
    .filter((artisan) => !["removed", "suspended"].includes(qualityByArtisanId.get(artisan.id)?.standing))
    .filter((artisan) => artisan.state === selectedState)
    .filter((artisan) => selectedArea === "All" || artisan.area === selectedArea)
    .filter((artisan) => {
      const haystack = `${artisan.category} ${artisan.name} ${artisan.area}`.toLowerCase();
      return !query || haystack.includes(query);
    })
    .map((artisan) => ({
      ...artisan,
      distance: milesBetween(activeOrigin, [artisan.lat, artisan.lng]),
    }))
    .sort((a, b) => {
      if (sortFilter.value === "rating") return b.rating - a.rating;
      if (sortFilter.value === "response") return parseInt(a.response, 10) - parseInt(b.response, 10);
      return a.distance - b.distance;
    });
}

function renderCards(matches) {
  resultCount.textContent = `${matches.length} artisan${matches.length === 1 ? "" : "s"}`;
  activeRegion.textContent = `${stateFilter.value}${areaFilter.value !== "All" ? `, ${areaFilter.value}` : ""}`;

  artisanList.innerHTML =
    matches
      .map(
        (artisan) => `
          <article class="artisan-card">
            <div class="artisan-top">
              <div>
                <h3>${artisan.name}</h3>
                <p>${artisan.category} in ${artisan.area}</p>
              </div>
              <span class="rating">${displayRating(artisan)}</span>
            </div>
            <div class="badge-row">
              <span class="badge ${artisan.plan === "Pro" ? "gold" : ""}">FixAm ${artisan.plan}</span>
              <span class="badge gold">NIN verified</span>
              <span class="badge">${subscriptionAccessLabel(artisan.subscriptionStatus)}</span>
              ${qualityBadge(artisan)}
              <span class="badge">${artisan.distance.toFixed(1)} miles away</span>
              <span class="badge">${artisan.jobs} jobs</span>
              <span class="badge">${artisan.response}</span>
            </div>
            <div class="card-actions">
              <button type="button" data-action="quote" data-artisan-id="${artisan.id}">Request quote</button>
              <button type="button" data-action="profile" data-artisan-id="${artisan.id}">View profile</button>
            </div>
          </article>
        `,
      )
      .join("") || `<article class="artisan-card"><h3>No matches yet</h3><p>Try another service or area.</p></article>`;
}

function renderMap(matches) {
  markers.forEach((marker) => marker.remove());
  markers = matches.map((artisan) =>
    L.marker([artisan.lat, artisan.lng], { icon: artisanIcon })
      .addTo(map)
      .bindPopup(
        `<span class="popup-title">${artisan.name}</span>${artisan.category}<br>${artisan.distance.toFixed(
          1,
        )} miles away`,
      ),
  );

  if (activeOriginLabel === "your current location") {
    if (userMarker) userMarker.remove();
    userMarker = L.circleMarker(activeOrigin, {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#0f7d66",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindPopup("Your current location");
  } else if (userMarker) {
    userMarker.remove();
    userMarker = null;
  }

  const selectedState = states.find((state) => state.name === stateFilter.value);
  map.invalidateSize();
  if (markers.length === 1) {
    map.setView([matches[0].lat, matches[0].lng], 12);
  } else if (markers.length) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.18));
  } else {
    map.setView(selectedState.center, 11);
  }

  mapStatus.textContent = `Showing ${matches.length} verified artisan${matches.length === 1 ? "" : "s"} near ${
    activeOriginLabel || stateFilter.value
  }`;
}

function render() {
  const matches = filteredArtisans();
  renderCards(matches);
  renderMap(matches);
  requestAnimationFrame(() => map.invalidateSize());
}

window.addEventListener("resize", () => {
  requestAnimationFrame(() => map.invalidateSize());
});

stateFilter.addEventListener("change", () => {
  syncAreas();
  render();
});

joinState.addEventListener("change", () => {
  saveStateName(joinState.value);
  syncJoinAreas();
});
areaFilter.addEventListener("change", () => {
  saveAreaName(areaFilter.value);
  render();
});
serviceSearch.addEventListener("input", render);
sortFilter.addEventListener("change", render);

document.querySelectorAll("[data-state]").forEach((button) => {
  button.addEventListener("click", () => {
    stateFilter.value = button.dataset.state;
    joinState.value = button.dataset.state;
    syncAreas();
    syncJoinAreas();
    render();
    document.querySelector("#marketplace").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll("[data-scroll-to]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.scrollTo}`).scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelector("[data-focus-search]").addEventListener("click", () => {
  serviceSearch.focus();
});

document.querySelector("#locateButton").addEventListener("click", () => {
  if (!navigator.geolocation) {
    activeOrigin = originByState[stateFilter.value];
    activeOriginLabel = null;
    render();
    mapStatus.textContent = "Location access is not available in this browser. Showing selected state instead.";
    return;
  }

  mapStatus.textContent = "Finding your current location...";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      activeOrigin = [coords.latitude, coords.longitude];
      activeOriginLabel = "your current location";
      render();
      map.setView(activeOrigin, 13);
    },
    () => {
      activeOrigin = originByState[stateFilter.value];
      activeOriginLabel = null;
      render();
      mapStatus.textContent = "Location permission was not granted. Showing selected state instead.";
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
});

artisanList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action][data-artisan-id]");
  if (!button) return;

  const artisan = artisans.find((item) => item.id === Number(button.dataset.artisanId));
  if (!artisan) return;

  if (button.dataset.action === "profile") {
    openProfile(artisan);
  } else {
    openQuote(artisan);
  }
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeModals);
});

[profileModal, quoteModal].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModals();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedQuoteArtisan) return;

  const requestId = `F9-${String(selectedQuoteArtisan.id).padStart(3, "0")}-${Date.now().toString().slice(-4)}`;
  const mediaFiles = selectedFiles("#quoteMedia");
  const payload = {
    request_code: requestId,
    artisan_id: selectedQuoteArtisan.id,
    artisan_name: selectedQuoteArtisan.name,
    artisan_category: selectedQuoteArtisan.category,
    artisan_state: selectedQuoteArtisan.state,
    artisan_area: selectedQuoteArtisan.area,
    customer_name: document.querySelector("#quoteName").value.trim(),
    customer_phone: document.querySelector("#quotePhone").value.trim(),
    job_location: document.querySelector("#quoteLocation").value.trim(),
    urgency: document.querySelector("#quoteUrgency").value,
    job_details: document.querySelector("#quoteDetails").value.trim(),
    customer_user_id: await currentUserId(),
    media_count: mediaFiles.length,
    source: "website",
  };

  setQuoteStatus("Sending request...", "");
  quoteSubmitButton.disabled = true;
  quoteSubmitButton.textContent = "Sending...";

  if (!supabaseClient) {
    setQuoteStatus(
      `Quote request ${requestId} prepared for ${selectedQuoteArtisan.name}. Add your Supabase URL and anon key to save it online.`,
      "success",
    );
    quoteSubmitButton.textContent = "Request prepared";
    quoteSubmitButton.disabled = false;
    return;
  }

  const { error } = await insertWithTimeout("quote_requests", payload);

  if (error) {
    setQuoteStatus(formatSubmitError(error), "error");
    quoteSubmitButton.textContent = "Try again";
    quoteSubmitButton.disabled = false;
    return;
  }

  const mediaResult = await uploadMediaFiles({
    files: mediaFiles,
    folder: `quote-requests/${requestId}`,
    entityType: "quote_request",
    entityId: requestId,
    role: "customer",
  });

  setQuoteStatus(
    mediaResult.error
      ? `Quote request ${requestId} sent, but media upload needs retry: ${mediaResult.error}`
      : `Quote request ${requestId} sent to ${selectedQuoteArtisan.name}. ${mediaResult.count} media file${
          mediaResult.count === 1 ? "" : "s"
        } attached.`,
    mediaResult.error ? "error" : "success",
  );
  quoteSubmitButton.textContent = "Request sent";
});

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const applicationCode = `F9-A-${Date.now().toString().slice(-6)}`;
  const mediaFiles = selectedFiles("#joinMedia");
  const selfieFiles = selectedFiles("#joinSelfie", 1);
  const fullName = document.querySelector("#joinName").value.trim();
  const applicantEmail = document.querySelector("#joinEmail").value.trim().toLowerCase();
  const normalizedPhone = normalizeNigerianPhone(document.querySelector("#joinPhone").value.trim());
  const nin = document.querySelector("#joinNin").value.trim();
  const hasNinConsent = document.querySelector("#joinNinConsent").checked;

  if (!fullName || fullName.includes("@")) {
    setJoinStatus("Enter the artisan's real full name, not an email address.", "error");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail)) {
    setJoinStatus("Enter a valid email address for login and application updates.", "error");
    return;
  }

  if (!/^\+234\d{10}$/.test(normalizedPhone)) {
    setJoinStatus("Enter a valid Nigerian phone number, for example +2348012345678.", "error");
    return;
  }

  if (!/^\d{11}$/.test(nin)) {
    setJoinStatus("Enter a valid 11-digit NIN before submitting.", "error");
    return;
  }

  if (!hasNinConsent) {
    setJoinStatus("Identity verification consent is required before an artisan can be listed.", "error");
    return;
  }

  if (!selfieFiles.length) {
    setJoinStatus("Add a clear selfie or short liveness video for identity verification.", "error");
    return;
  }

  if (!isAllowedMedia(selfieFiles[0])) {
    setJoinStatus("Selfie/liveness proof must be a supported image/video under 50MB.", "error");
    return;
  }

  const payload = {
    application_code: applicationCode,
    full_name: fullName,
    applicant_email: applicantEmail,
    trade: joinTrade.value,
    state: joinState.value,
    area: joinArea.value,
    phone: normalizedPhone,
    preferred_plan: document.querySelector("#joinPlan").value,
    years_experience: Number(document.querySelector("#joinExperience").value),
    work_summary: document.querySelector("#joinDetails").value.trim(),
    applicant_user_id: await currentUserId(),
    nin_last4: nin.slice(-4),
    nin_consent: hasNinConsent,
    nin_consent_at: new Date().toISOString(),
    liveness_consent: hasNinConsent,
    liveness_consent_at: new Date().toISOString(),
    identity_verification_status: "pending",
    verification_media_count: selfieFiles.length,
    subscription_status: "pending",
    subscription_plan: document.querySelector("#joinPlan").value,
    subscription_amount: subscriptionAmountForPlan(document.querySelector("#joinPlan").value),
    media_count: mediaFiles.length,
    source: "website",
  };

  setJoinStatus("Sending application...", "");
  joinSubmitButton.disabled = true;
  joinSubmitButton.textContent = "Sending...";

  if (!supabaseClient) {
    setJoinStatus(
      `Application ${applicationCode} prepared. Add your Supabase URL and anon key to save it online.`,
      "success",
    );
    joinSubmitButton.textContent = "Application prepared";
    joinSubmitButton.disabled = false;
    return;
  }

  const { error } = await insertWithTimeout("artisan_applications", payload);

  if (error) {
    setJoinStatus(formatSubmitError(error), "error");
    joinSubmitButton.textContent = "Try again";
    joinSubmitButton.disabled = false;
    return;
  }

  setJoinStatus("Application received. Uploading private selfie/liveness proof...", "");
  const verificationMediaResult = await uploadMediaFiles({
    files: selfieFiles,
    folder: `identity-verification/${applicationCode}`,
    entityType: "identity_verification",
    entityId: applicationCode,
    role: "artisan",
    bucket: "fixam-verification",
    visibility: "private",
  });

  if (verificationMediaResult.error) {
    setJoinStatus(
      `Application ${applicationCode} received, but selfie/liveness upload needs retry: ${verificationMediaResult.error}`,
      "error",
    );
    joinSubmitButton.textContent = "Try again";
    joinSubmitButton.disabled = false;
    return;
  }

  setJoinStatus("Selfie/liveness proof received. Checking identity verification...", "");
  const verificationResult = await verifyNinForApplication({
    applicationCode,
    applicantEmail,
    fullName,
    phone: payload.phone,
    nin,
    selfieMediaPaths: verificationMediaResult.paths || [],
  });

  const mediaResult = await uploadMediaFiles({
    files: mediaFiles,
    folder: `artisan-applications/${applicationCode}`,
    entityType: "artisan_application",
    entityId: applicationCode,
    role: "artisan",
  });

  const finalMessage = mediaResult.error
    ? `Application ${applicationCode} received, but media upload needs retry: ${mediaResult.error}`
    : `Application ${applicationCode} received with ${mediaResult.count} media file${
        mediaResult.count === 1 ? "" : "s"
      }. ${verificationStatusMessage(verificationResult)}`;
  const finalType = mediaResult.error || verificationResult.status === "failed" ? "error" : "success";
  const nextAction = {
    url: verificationResult.verification_url,
    sdkSessionToken: verificationResult.sdk_session_token,
    reference: verificationResult.reference || applicationCode,
    applicationCode,
    plan: payload.subscription_plan,
    fullName,
    email: applicantEmail,
    phone: payload.phone,
  };
  if (!foundingLaunchFree) {
    nextAction.amount = payload.subscription_amount;
  }
  setJoinStatus(finalMessage, finalType, nextAction);
  joinSubmitButton.textContent = "Application sent";
  joinForm.reset();
  syncJoinAreas();
});

async function verifyNinForApplication({ applicationCode, applicantEmail, fullName, phone, nin, selfieMediaPaths }) {
  if (!supabaseClient) return { status: "pending", message: "Supabase is not configured." };

  const { data, error } = await supabaseClient.functions.invoke("verify-nin", {
    body: {
      application_code: applicationCode,
      applicant_email: applicantEmail,
      full_name: fullName,
      phone,
      nin,
      selfie_media_paths: selfieMediaPaths,
      liveness_consent: true,
      consent: true,
    },
  });

  if (error) {
    return {
      status: "pending",
      message: "Identity verification is pending because the verification service is not available yet.",
    };
  }

  return data || { status: "pending", message: "Identity verification is pending." };
}

function verificationStatusMessage(result) {
  if (result.status === "verified") {
    return foundingLaunchFree
      ? "Identity verification passed. Founding artisans can be listed during the free launch period."
      : "Identity verification passed. We will activate visibility after launch approval/subscription.";
  }

  if (result.status === "failed") {
    return `${result.message || "Identity verification could not be completed."} FixAm 9ja will review it manually.`;
  }

  return foundingLaunchFree
    ? `${result.message || "Identity verification is pending."} Once verified, your founding listing can go live during the free launch period.`
    : `${result.message || "Identity verification is pending."} Next step: subscription activation before listing.`;
}

async function loadTrustSignals() {
  if (!supabaseClient) return;

  const [reviewResult, qualityResult] = await Promise.all([
    supabaseClient
      .from("artisan_reviews")
      .select("artisan_id, rating, would_recommend, comment, created_at, visibility")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseClient.from("artisan_quality_controls").select("artisan_id, standing, admin_note"),
  ]);

  if (!reviewResult.error) {
    reviewStatsByArtisanId = buildReviewStats(reviewResult.data || []);
  }

  if (!qualityResult.error) {
    qualityByArtisanId = new Map((qualityResult.data || []).map((item) => [item.artisan_id, item]));
  }

}

function subscriptionAmountForPlan(plan) {
  const amounts = {
    monthly: 2500,
    biannual: 12000,
    annual: 24000,
  };
  return amounts[plan] || amounts.monthly;
}

async function loadRealArtisans() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("artisans")
    .select(
      "id, state, area, category, business_name, lat, lng, rating, jobs, response_time, plan, subscription_plan, subscription_status, bio, skills, availability, service_radius, completed_jobs, verification_status, verification_checks, portfolio_items, profile_status",
    )
    .eq("profile_status", "active")
    .eq("verification_status", "verified")
    .in("subscription_status", ["active", "founding", "free_trial"])
    .order("business_name");

  if (error) {
    artisans = [];
    syncAreas();
    return;
  }

  artisans = (data || []).map((artisan) => ({
    id: artisan.id,
    state: artisan.state,
    area: artisan.area,
    category: artisan.category,
    name: artisan.business_name,
    lat: Number(artisan.lat),
    lng: Number(artisan.lng),
    rating: Number(artisan.rating || 4.5),
    jobs: Number(artisan.jobs || 0),
    response: artisan.response_time || "30 min",
    plan: artisan.plan || "Basic",
    subscription: artisan.subscription_plan || "monthly",
    subscriptionStatus: artisan.subscription_status || "active",
    initials: artisan.business_name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join(""),
    bio:
      artisan.bio ||
      `${artisan.business_name} is a ${artisan.category.toLowerCase()} serving ${artisan.area}, ${artisan.state}.`,
    skills: artisan.skills?.length ? artisan.skills : serviceSkills(artisan.category),
    availability: artisan.availability || "Taking scheduled jobs",
    radius: Number(artisan.service_radius || 10),
    completed: Number(artisan.completed_jobs || artisan.jobs || 0),
    verification: artisan.verification_checks?.length
      ? artisan.verification_checks
      : ["NIN verified", subscriptionAccessLabel(artisan.subscription_status)],
    portfolio: artisan.portfolio_items?.length ? artisan.portfolio_items : portfolioFor(artisan.category),
  }));

  syncAreas();
}

function subscriptionAccessLabel(status) {
  if (status === "founding") return "Founding launch access";
  if (status === "free_trial") return "Free launch access";
  if (status === "active") return "Subscription active";
  return "Launch access pending";
}

function buildReviewStats(reviews) {
  const stats = new Map();

  reviews.forEach((review) => {
    const current = stats.get(review.artisan_id) || {
      count: 0,
      total: 0,
      recommend: 0,
      latest: [],
    };
    current.count += 1;
    current.total += review.rating;
    if (review.would_recommend) current.recommend += 1;
    if (current.latest.length < 2) current.latest.push(review);
    stats.set(review.artisan_id, current);
  });

  return stats;
}

function displayRating(artisan) {
  const stats = reviewStatsByArtisanId.get(artisan.id);
  if (!stats) return `★ ${artisan.rating}`;
  return `★ ${(stats.total / stats.count).toFixed(1)} (${stats.count})`;
}

function qualityBadge(artisan) {
  const standing = qualityByArtisanId.get(artisan.id)?.standing;
  if (!standing || standing === "active") return "";
  return `<span class="badge ${standing === "warning" ? "gold" : ""}">${standing}</span>`;
}

function reviewSummary(artisan) {
  const stats = reviewStatsByArtisanId.get(artisan.id);
  if (!stats) {
    return `<p>No customer reviews yet. Ratings will update automatically after verified customers submit reviews.</p>`;
  }

  const average = (stats.total / stats.count).toFixed(1);
  const recommendRate = Math.round((stats.recommend / stats.count) * 100);
  const latest = stats.latest
    .map((review) => `<article><strong>★ ${review.rating}</strong><small>${escapeHtml(review.comment)}</small></article>`)
    .join("");

  return `
    <div class="profile-metrics compact">
      <span><strong>${average}</strong> Customer rating</span>
      <span><strong>${stats.count}</strong> Reviews</span>
      <span><strong>${recommendRate}%</strong> Recommend</span>
    </div>
    <div class="portfolio-grid">${latest}</div>
  `;
}

function setQuoteStatus(message, type) {
  quoteNote.textContent = message;
  quoteNote.classList.remove("success-note", "error-note");
  if (type === "success") quoteNote.classList.add("success-note");
  if (type === "error") quoteNote.classList.add("error-note");
}

function setJoinStatus(message, type, action = "") {
  joinNote.textContent = message;
  joinNote.classList.remove("success-note", "error-note");
  if (type === "success") joinNote.classList.add("success-note");
  if (type === "error") joinNote.classList.add("error-note");

  const actionUrl = typeof action === "string" ? action : action?.url;
  const sdkSessionToken = typeof action === "object" ? action?.sdkSessionToken : "";
  const canRequestSubscription = typeof action === "object" && action?.applicationCode && action?.amount;

  if (sdkSessionToken) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-action-link";
    button.textContent = "Start identity check";
    button.addEventListener("click", () => launchQoreIdWorkflow(action));
    joinNote.appendChild(document.createElement("br"));
    joinNote.appendChild(button);
  }

  if (actionUrl) {
    const link = document.createElement("a");
    link.href = actionUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "status-action-link";
    link.textContent = "Continue identity verification";
    joinNote.appendChild(document.createElement("br"));
    joinNote.appendChild(link);
  }

  if (canRequestSubscription) {
    const subscriptionButton = document.createElement("button");
    subscriptionButton.type = "button";
    subscriptionButton.className = "status-action-link";
    subscriptionButton.textContent = `Request subscription activation - ${formatNaira(action.amount)}`;
    subscriptionButton.addEventListener("click", () => createSubscriptionRequest(action, subscriptionButton));
    joinNote.appendChild(document.createElement("br"));
    joinNote.appendChild(subscriptionButton);
  }
}

async function createSubscriptionRequest(action, button) {
  if (!supabaseClient) {
    setJoinStatus("Subscription request is ready, but Supabase is not configured yet.", "error", action);
    return;
  }

  button.disabled = true;
  button.textContent = "Saving activation request...";
  const requestCode = `F9-S-${Date.now().toString().slice(-6)}`;
  const { error } = await supabaseClient.from("subscription_requests").insert({
    request_code: requestCode,
    application_code: action.applicationCode,
    applicant_email: action.email,
    applicant_user_id: await currentUserId(),
    applicant_phone: action.phone,
    applicant_name: action.fullName,
    plan: action.plan || "monthly",
    amount: Number(action.amount || 2500),
    status: "pending",
    channel: "manual_activation",
    source: "website",
  });

  if (error) {
    setJoinStatus(
      `Subscription activation could not be saved yet: ${error.message}. Run the Phase 7 SQL, then try again.`,
      "error",
      action,
    );
    return;
  }

  setJoinStatus(
    `Subscription activation request ${requestCode} saved. FixAm 9ja will confirm payment setup before public listing.`,
    "success",
  );
}

async function launchQoreIdWorkflow(action) {
  try {
    setJoinStatus("Opening secure QoreID identity check...", "");
    enterQoreIdMode();
    const QoreID = await loadQoreIdSdk();
    const name = splitFullName(action.fullName || "");

    if (typeof QoreID.on === "function" && !QoreID.__fixamListenersAttached) {
      QoreID.on("success", () => {
        exitQoreIdMode();
        setJoinStatus("Identity check completed. FixAm 9ja will confirm the verification result shortly.", "success");
      });
      QoreID.on("error", () => {
        exitQoreIdMode();
        setJoinStatus("QoreID could not complete the identity check. Please try again or FixAm 9ja will review manually.", "error", action);
      });
      QoreID.on("close", () => {
        exitQoreIdMode();
        setJoinStatus("Identity check was closed before completion. You can start it again when ready.", "error", action);
      });
      QoreID.__fixamListenersAttached = true;
    }

    await QoreID.start({
      token: action.sdkSessionToken,
      customerReference: action.reference,
      applicantData: {
        firstname: name.first,
        lastname: name.last,
        email: action.email,
        phone: normalizeNigerianPhone(action.phone),
      },
    });
  } catch (error) {
    exitQoreIdMode();
    setJoinStatus(
      `QoreID identity check could not open: ${error.message || "SDK unavailable"}. FixAm 9ja will review manually.`,
      "error",
    );
  }
}

function enterQoreIdMode() {
  const hiddenElements = [".topbar", "footer"].flatMap((selector) =>
    Array.from(document.querySelectorAll(selector)),
  );

  document.documentElement.classList.add("qoreid-active");
  document.body.classList.add("qoreid-active");

  hiddenElements.forEach((element) => {
    if (!element.dataset.fixamPreviousDisplay) {
      element.dataset.fixamPreviousDisplay = element.style.display || " ";
      element.dataset.fixamPreviousVisibility = element.style.visibility || " ";
    }
    element.style.display = "none";
    element.style.visibility = "hidden";
  });

  window.scrollTo(0, 0);
  window.setTimeout(() => window.scrollTo(0, 0), 100);

  if (qoreIdRestoreTimer) window.clearInterval(qoreIdRestoreTimer);
  qoreIdRestoreTimer = window.setInterval(() => {
    if (!document.body.classList.contains("qoreid-active")) return;
    hiddenElements.forEach((element) => {
      element.style.display = "none";
      element.style.visibility = "hidden";
    });
  }, 500);
}

function exitQoreIdMode() {
  if (qoreIdRestoreTimer) {
    window.clearInterval(qoreIdRestoreTimer);
    qoreIdRestoreTimer = null;
  }

  [".topbar", "footer"].forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      const previousDisplay = element.dataset.fixamPreviousDisplay;
      const previousVisibility = element.dataset.fixamPreviousVisibility;

      element.style.display = previousDisplay && previousDisplay !== " " ? previousDisplay : "";
      element.style.visibility = previousVisibility && previousVisibility !== " " ? previousVisibility : "";
      delete element.dataset.fixamPreviousDisplay;
      delete element.dataset.fixamPreviousVisibility;
    });
  });

  document.documentElement.classList.remove("qoreid-active");
  document.body.classList.remove("qoreid-active");
}

async function loadQoreIdSdk() {
  if (window.QoreID) return window.QoreID;

  const module = await import("https://esm.sh/@qore-id/web-sdk");
  const QoreID = module.default || module.QoreID || window.QoreID;

  if (!QoreID || typeof QoreID.start !== "function") {
    throw new Error("QoreID Web SDK did not load");
  }

  window.QoreID = QoreID;
  return QoreID;
}

function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "FixAm",
    last: parts.slice(1).join(" ") || "Artisan",
  };
}

function normalizeNigerianPhone(value) {
  const original = String(value || "").trim();
  const digits = original.replace(/\D+/g, "");

  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;

  return original;
}

async function insertWithTimeout(table, payload) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    return await supabaseClient.from(table).insert(payload).abortSignal(controller.signal);
  } catch (error) {
    return { error };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function currentUserId() {
  if (!supabaseClient) return null;
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  return user?.id || null;
}

function selectedFiles(selector, limit = 4) {
  const input = document.querySelector(selector);
  return input ? [...input.files].slice(0, limit) : [];
}

async function uploadMediaFiles({ files, folder, entityType, entityId, role, bucket = "fixam-media", visibility = "public" }) {
  if (!supabaseClient || !files.length) return { count: 0 };

  const uploadedBy = await currentUserId();
  let count = 0;
  const paths = [];

  for (const file of files) {
    if (!isAllowedMedia(file)) {
      return { count, error: `${file.name} is too large or not a supported image/video type.` };
    }

    const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) return { count, error: uploadError.message };

    const publicUrl =
      visibility === "public"
        ? supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl
        : null;

    const { error: metadataError } = await supabaseClient.from("media_uploads").insert({
      bucket,
      storage_path: path,
      public_url: publicUrl,
      entity_type: entityType,
      entity_id: entityId,
      uploaded_by_role: role,
      uploaded_by_user_id: uploadedBy,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      visibility,
    });

    if (metadataError) return { count, error: metadataError.message };
    count += 1;
    paths.push(path);
  }

  return { count, paths };
}

function isAllowedMedia(file) {
  const validType = file.type.startsWith("image/") || file.type.startsWith("video/");
  return validType && file.size <= 50 * 1024 * 1024;
}

function safeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatSubmitError(error) {
  return error.name === "AbortError"
    ? "The request took too long. Please check your connection and try again."
    : `We could not save this yet: ${error.message}`;
}

function openProfile(artisan) {
  profileContent.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar">${artisan.initials}</div>
      <div>
        <p class="eyebrow">${artisan.category} in ${artisan.area}</p>
        <h2 id="profileTitle">${artisan.name}</h2>
        <p>${artisan.bio}</p>
      </div>
    </div>
    <div class="profile-metrics">
      <span><strong>${artisan.rating}</strong> Rating</span>
      <span><strong>${displayRating(artisan).replace("★ ", "")}</strong> Live rating</span>
      <span><strong>${artisan.completed}</strong> Completed jobs</span>
      <span><strong>${artisan.response}</strong> Response</span>
      <span><strong>${artisan.radius} mi</strong> Service radius</span>
    </div>
    <div class="profile-grid">
      <section>
        <h3>Skills</h3>
        <div class="badge-row">${artisan.skills.map((skill) => `<span class="badge">${skill}</span>`).join("")}</div>
      </section>
      <section>
        <h3>Verification</h3>
        <div class="check-list">${artisan.verification.map((item) => `<span>${item}</span>`).join("")}</div>
      </section>
      <section>
        <h3>Portfolio</h3>
        <div class="portfolio-grid">${artisan.portfolio
          .map((item) => `<article><strong>${item}</strong><small>${artisan.area}, ${artisan.state}</small></article>`)
          .join("")}</div>
      </section>
      <section>
        <h3>Availability</h3>
        <p>${artisan.availability}. Typical first response is ${artisan.response.toLowerCase()}.</p>
      </section>
      <section>
        <h3>Customer reviews</h3>
        ${reviewSummary(artisan)}
      </section>
    </div>
    <div class="profile-actions">
      <button class="primary-action large" type="button" data-profile-quote="${artisan.id}">Request quote</button>
      <button class="secondary-action large" type="button" data-close-modal>Back to results</button>
    </div>
  `;

  profileContent.querySelector("[data-profile-quote]").addEventListener("click", () => openQuote(artisan));
  profileContent.querySelector("[data-close-modal]").addEventListener("click", closeModals);
  showModal(profileModal);
}

function openQuote(artisan) {
  selectedQuoteArtisan = artisan;
  quoteArtisanText.textContent = `Requesting ${artisan.category.toLowerCase()} support from ${artisan.name} in ${artisan.area}, ${artisan.state}.`;
  setQuoteStatus("Your request will be saved once the FixAm 9ja database is connected.", "");
  quoteForm.reset();
  quoteSubmitButton.disabled = false;
  quoteSubmitButton.textContent = "Send quote request";
  showModal(quoteModal);
  document.querySelector("#quoteName").focus();
}

function showModal(modal) {
  closeModals();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModals() {
  [profileModal, quoteModal].forEach((modal) => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  });
  document.body.classList.remove("modal-open");
}

syncAreas();
syncJoinAreas();
render();
initializeDirectory();

async function initializeDirectory() {
  await loadServiceCategories();
  await Promise.all([loadRealArtisans(), loadTrustSignals()]);
  render();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
