const locationDirectory = window.FIXAM_LOCATIONS || { states: [], centers: {} };
const states = locationDirectory.states.map((state) => ({ ...state, areas: state.lgas }));

const defaultServiceCategories = [
  ["Electrician", "Power, wiring, repairs", ["House wiring", "Fault tracing", "Inverter setup"]],
  ["Plumber", "Leaks, fittings, water systems", ["Leak repair", "Pipe fitting", "Pump setup"]],
  ["Carpenter", "Furniture, fittings, woodwork", ["Cabinets", "Doors", "Furniture repair"]],
  ["Welder", "Metalwork, fabrication, repairs", ["Welding", "Gate fabrication", "Metal repairs"]],
  ["Painter", "Homes, offices, finishing", ["Interior finish", "Exterior painting", "Wall prep"]],
  ["Tiler", "Floor, wall, bathroom tiling", ["Floor tiling", "Wall tiling", "Bathroom finishing"]],
  ["Bricklayer", "Blocks, walls, foundations", ["Block work", "Foundations", "Wall construction"]],
  ["Mason", "Stonework, concrete, construction", ["Concrete work", "Stonework", "Construction repairs"]],
  ["POP Installer", "Ceiling, cornices, finishing", ["POP ceilings", "Cornices", "Interior finishing"]],
  ["Roofer", "Roofing, repairs, gutters", ["Roof repairs", "Gutter work", "Roof installation"]],
  ["Aluminum Fabricator", "Windows, doors, partitions", ["Aluminum windows", "Doors", "Office partitions"]],
  ["Glass Installer (Glazier)", "Glass, mirrors, storefronts", ["Glass installation", "Mirrors", "Storefronts"]],
  ["AC Technician", "Cooling, servicing, installation", ["AC servicing", "Gas refill", "Installation"]],
  ["Refrigeration Technician", "Fridges, freezers, cold rooms", ["Fridge repair", "Freezer repair", "Cold rooms"]],
  ["Solar Installer", "Panels, inverters, batteries", ["Panel setup", "Battery wiring", "Load audit"]],
  ["CCTV Installer", "Cameras, security systems", ["Camera installation", "DVR setup", "Security systems"]],
  ["Satellite/DSTV Installer", "Satellite dishes, decoder setup", ["Dish installation", "Decoder setup", "Signal troubleshooting"]],
  ["Generator Technician", "Generator repair and maintenance", ["Generator servicing", "Fault repair", "Maintenance"]],
  ["Mechanic", "Vehicle repair and diagnostics", ["Diagnostics", "Engine service", "Brake repair"]],
  ["Auto Electrician", "Vehicle electrical systems", ["Vehicle wiring", "Battery issues", "Electrical diagnostics"]],
  ["Vulcanizer", "Tyres, punctures, balancing", ["Puncture repair", "Tyre fitting", "Balancing"]],
  ["Panel Beater", "Vehicle body repairs", ["Body repairs", "Dent removal", "Accident repairs"]],
  ["Spray Painter", "Auto body painting", ["Vehicle painting", "Body finishing", "Paint matching"]],
  ["Upholsterer", "Furniture, car seats, cushions", ["Seat repairs", "Cushions", "Furniture upholstery"]],
  ["Furniture Maker", "Custom furniture, cabinetry", ["Custom furniture", "Cabinets", "Wardrobes"]],
  ["Locksmith", "Keys, locks, security", ["Key cutting", "Lock repairs", "Security locks"]],
  ["Borehole Technician", "Drilling, pumps, water systems", ["Borehole pumps", "Drilling support", "Water systems"]],
  ["Water Treatment Technician", "Water purification systems", ["Water filters", "Purification systems", "Treatment setup"]],
  ["Fumigator", "Pest control services", ["Pest control", "Fumigation", "Sanitation"]],
  ["Cleaner", "Home and office cleaning", ["Home cleaning", "Office cleaning", "Deep cleaning"]],
  ["Laundry & Dry Cleaning", "Washing, ironing, dry cleaning", ["Laundry", "Ironing", "Dry cleaning"]],
  ["Tailor", "Fashion, uniforms, alterations", ["Native wear", "Alterations", "Uniforms"]],
  ["Fashion Designer", "Custom clothing and styling", ["Custom clothing", "Styling", "Fashion design"]],
  ["Shoe Maker", "Shoes, sandals, leatherwork", ["Shoe making", "Sandal repairs", "Leatherwork"]],
  ["Bag Maker", "Bags, leather products", ["Bag making", "Leather products", "Repairs"]],
  ["Hair Stylist", "Hair cutting and styling", ["Hair styling", "Braids", "Hair treatment"]],
  ["Barber", "Men's grooming", ["Haircuts", "Shaving", "Grooming"]],
  ["Makeup Artist", "Bridal and event makeup", ["Bridal makeup", "Event makeup", "Gele styling"]],
  ["Nail Technician", "Manicure and pedicure", ["Manicure", "Pedicure", "Nail art"]],
  ["Interior Decorator", "Home and office decor", ["Interior styling", "Space planning", "Decor setup"]],
  ["Sign Writer", "Business signs and branding", ["Business signs", "Lettering", "Branding"]],
  ["Graphic Installer", "Vinyl, banners, branding", ["Vinyl installation", "Banners", "Wall branding"]],
  ["Appliance Repair Technician", "TVs, washing machines, microwaves", ["TV repairs", "Washing machines", "Microwaves"]],
  ["Phone Repair Technician", "Smartphones and tablets", ["Screen replacement", "Battery replacement", "Software fixes"]],
  ["Computer Technician", "Laptop and desktop repairs", ["Laptop repair", "Desktop repair", "Software support"]],
  ["IT Technician", "Computers, networks, CCTV, printers", ["Laptop repair", "Network setup", "Printer support"]],
];

let categories = defaultServiceCategories.map(([name, description, skills]) => ({ name, description, skills }));

const demoArtisans = [
  ["Lagos", "Ikeja", "Electrician", "Tunde Bright Electricals", 6.6018, 3.3515, 4.9, 22, "12 min", "Verified"],
  ["Lagos", "Eti-Osa", "AC Technician", "Kemi CoolFix Services", 6.4698, 3.5852, 4.8, 18, "18 min", "Pro"],
  ["Lagos", "Lagos Mainland", "Tailor", "Ayo Urban Stitches", 6.5145, 3.3896, 4.7, 31, "20 min", "Verified"],
  ["Abuja/FCT", "Abuja Municipal Area Council", "Plumber", "Musa FlowMaster", 9.0833, 7.4667, 4.9, 27, "15 min", "Verified"],
  ["Abuja/FCT", "Abuja Municipal Area Council", "Solar Installer", "NorthLight Solar Works", 9.1099, 7.4042, 4.8, 16, "24 min", "Pro"],
  ["Abuja/FCT", "Abuja Municipal Area Council", "Painter", "FCT Prime Finishers", 9.0339, 7.4898, 4.6, 20, "21 min", "Basic"],
  ["Edo", "Oredo", "Carpenter", "Osas FineWood Studio", 6.3349, 5.6037, 4.9, 34, "17 min", "Verified"],
  ["Edo", "Etsako West", "Mechanic", "Ibrahim AutoCare", 7.0676, 6.2636, 4.7, 19, "29 min", "Verified"],
  ["Edo", "Esan West", "Tailor", "Grace Fit & Sew", 6.742, 6.139, 4.8, 25, "25 min", "Pro"],
  ["Ogun", "Abeokuta South", "Plumber", "RockCity Pipe Works", 7.1475, 3.3619, 4.7, 15, "19 min", "Verified"],
  ["Ogun", "Ado-Odo/Ota", "Electrician", "Ota Smart Wiring", 6.6899, 3.232, 4.8, 29, "16 min", "Pro"],
  ["Ogun", "Sagamu", "Painter", "Remo Finish Crew", 6.8322, 3.6319, 4.5, 11, "33 min", "Basic"],
  ["Delta", "Warri South", "Mechanic", "Efe Rapid Motors", 5.5167, 5.75, 4.9, 41, "14 min", "Pro"],
  ["Delta", "Oshimili South", "Electrician", "Nedu PowerCare", 6.1985, 6.7319, 4.8, 26, "22 min", "Verified"],
  ["Delta", "Sapele", "Carpenter", "Delta Woodline", 5.8941, 5.6767, 4.6, 13, "35 min", "Basic"],
  ["Rivers", "Port Harcourt", "AC Technician", "PH CoolRoom Experts", 4.8156, 7.0498, 4.9, 37, "13 min", "Pro"],
  ["Rivers", "Obio/Akpor", "Plumber", "Rivers LeakStop", 4.8678, 7.012, 4.8, 23, "20 min", "Verified"],
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

// Production listings are loaded from Supabase. Never render sample profiles while live data is loading.
let artisans = [];
let marketplaceLoading = true;
let marketplaceLoadError = "";
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
const originByArea = locationDirectory.centers || {
  Lagos: {
    Ikeja: [6.6018, 3.3515],
    Lekki: [6.4698, 3.5852],
    Yaba: [6.5167, 3.3833],
    Surulere: [6.5004, 3.3555],
    Ajah: [6.4698, 3.5675],
  },
  "Abuja/FCT": {
    Wuse: [9.0747, 7.4702],
    Garki: [9.0333, 7.4833],
    Maitama: [9.0907, 7.4951],
    Gwarinpa: [9.1099, 7.4042],
    Lugbe: [8.994, 7.3675],
  },
  Edo: {
    "Benin City": [6.335, 5.6037],
    Ekpoma: [6.743, 6.1403],
    Auchi: [7.0676, 6.2636],
    Uromi: [6.7, 6.3333],
  },
  Ogun: {
    Abeokuta: [7.1475, 3.3619],
    "Sango Ota": [6.6924, 3.2365],
    "Ijebu Ode": [6.8161, 3.9159],
    Sagamu: [6.8322, 3.6319],
  },
  Delta: {
    Warri: [5.5167, 5.75],
    Asaba: [6.2006, 6.7338],
    Sapele: [5.894, 5.6767],
    Ughelli: [5.4896, 6.0041],
  },
  Rivers: {
    "Port Harcourt": [4.8156, 7.0498],
    "Obio-Akpor": [4.8675, 7.0176],
    Bonny: [4.4522, 7.1681],
    Eleme: [4.7801, 7.1174],
  },
};
const defaultStateName = "Lagos";
const stateStorageKey = "fixam9ja.selectedState";
const areaStorageKey = "fixam9ja.selectedArea";
const foundingLaunchFree = true;
let activeOrigin = originByState[defaultStateName];
let activeOriginLabel = null;
let animateLgaFocus = false;
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
const popularServicesNote = document.querySelector("#popularServicesNote");
const toggleServicesButton = document.querySelector("#toggleServicesButton");
const artisanList = document.querySelector("#artisanList");
const resultCount = document.querySelector("#resultCount");
const activeRegion = document.querySelector("#activeRegion");
const mapStatus = document.querySelector("#mapStatus");
const marketplaceViews = document.querySelector("#marketplaceViews");
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
const joinTown = document.querySelector("#joinTown");
const joinNote = document.querySelector("#joinNote");
const joinSubmitButton = joinForm.querySelector("button[type='submit']");
const joinNextButton = document.querySelector("#joinNextButton");
const joinBackButton = document.querySelector("#joinBackButton");
const joinStepLabel = document.querySelector("#joinStepLabel");
const joinStepTitle = document.querySelector("#joinStepTitle");
const joinProgressBar = document.querySelector("#joinProgressBar");
const joinOtpField = document.querySelector("#joinOtpField");
const joinOtpInput = document.querySelector("#joinOtp");
let selectedQuoteArtisan = null;
let showAllServices = false;
let joinStep = 1;
let joinOtpRequestedFor = "";

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
        <p>${state.areas.length} LGAs/Area Councils available for local discovery.</p>
        <button type="button" data-state="${state.name}">Explore ${state.name}</button>
      </article>
    `,
  )
  .join("");

renderServiceCatalog();
renderJoinTradeOptions();
initializeJoinSteps();

const map = L.map("map", { scrollWheelZoom: false }).setView(originByState[stateFilter.value], 11);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | LGA data: <a href="https://www.geoboundaries.org/">GRID3/geoBoundaries</a>',
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

function areaOrigin(stateName, areaName) {
  const state = states.find((item) => item.name === stateName);
  if (!state || !areaName || areaName === "All") return state?.center || originByState[defaultStateName];
  if (originByArea[stateName]?.[areaName]) return originByArea[stateName][areaName];

  const areaArtisans = artisans.filter(
    (artisan) => artisan.state === stateName && artisan.area === areaName && Number.isFinite(artisan.lat) && Number.isFinite(artisan.lng),
  );

  if (areaArtisans.length) {
    const totals = areaArtisans.reduce(
      (sum, artisan) => [sum[0] + artisan.lat, sum[1] + artisan.lng],
      [0, 0],
    );
    return [totals[0] / areaArtisans.length, totals[1] / areaArtisans.length];
  }

  const areaIndex = state.areas.indexOf(areaName);
  const angle = ((areaIndex >= 0 ? areaIndex : 0) / Math.max(state.areas.length, 1)) * Math.PI * 2;
  return [state.center[0] + Math.sin(angle) * 0.08, state.center[1] + Math.cos(angle) * 0.08];
}

function setSelectedOrigin() {
  activeOrigin = areaOrigin(stateFilter.value, areaFilter.value);
  activeOriginLabel = areaFilter.value !== "All" ? `${areaFilter.value}, ${stateFilter.value}` : null;
}

function syncAreas() {
  const selected = states.find((state) => state.name === stateFilter.value);
  const selectedArea = areaFilter.value || savedAreaName(selected.name);
  areaFilter.innerHTML = "";
  areaFilter.add(new Option("All LGAs / Area Councils", "All"));
  selected.areas.forEach((area) => areaFilter.add(new Option(area, area)));
  areaFilter.value = selected.areas.includes(selectedArea) ? selectedArea : "All";
  setSelectedOrigin();
  saveStateName(selected.name);
  saveAreaName(areaFilter.value);
}

function syncJoinAreas() {
  const selected = states.find((state) => state.name === joinState.value);
  joinArea.innerHTML = "";
  selected.areas.forEach((area) => joinArea.add(new Option(area, area)));
}

function renderServiceCatalog() {
  const stateName = stateFilter.value || defaultStateName;
  const areaName = areaFilter.value || "All";
  const locationLabel = areaName === "All" ? stateName : `${areaName}, ${stateName}`;
  const localArtisans = artisans.filter(
    (artisan) =>
      artisan.state === stateName &&
      (areaName === "All" || artisan.area === areaName) &&
      !["removed", "suspended"].includes(qualityByArtisanId.get(artisan.id)?.standing),
  );
  const activityByCategory = localArtisans.reduce((activity, artisan) => {
    const key = String(artisan.category).toLowerCase();
    const current = activity.get(key) || { providers: 0, jobs: 0 };
    current.providers += 1;
    current.jobs += Number(artisan.completed || artisan.jobs || 0);
    activity.set(key, current);
    return activity;
  }, new Map());
  const rankedCategories = categories
    .map((category, index) => ({
      ...category,
      index,
      activity: activityByCategory.get(category.name.toLowerCase()) || { providers: 0, jobs: 0 },
    }))
    .sort((a, b) => b.activity.jobs - a.activity.jobs || b.activity.providers - a.activity.providers || a.index - b.index);
  const visibleCategories = showAllServices ? rankedCategories : rankedCategories.slice(0, 8);

  popularServicesNote.textContent = localArtisans.length
    ? `Ranked for ${locationLabel} using active marketplace availability and completed-job activity.`
    : `Showing available service categories for ${locationLabel}. Rankings will update as marketplace activity grows.`;
  toggleServicesButton.hidden = rankedCategories.length <= 8;
  toggleServicesButton.textContent = showAllServices ? "Show popular services" : "View all services";
  toggleServicesButton.setAttribute("aria-expanded", String(showAllServices));

  categoryGrid.innerHTML = visibleCategories
    .map(
      ({ name, description, activity }) => `
        <button class="category-card" type="button" data-service-category="${escapeHtml(name)}">
          <span class="category-icon">${escapeHtml(name.slice(0, 2))}</span>
          <span class="service-signal">${activity.providers ? `Available in ${escapeHtml(locationLabel)}` : "Service category"}</span>
          <h3>${escapeHtml(customerServiceLabel(name))}</h3>
          <p>${escapeHtml(description)}</p>
          <span class="service-card-action">Find artisans <span aria-hidden="true">→</span></span>
        </button>
      `,
    )
    .join("");
}

function customerServiceLabel(name) {
  const labels = {
    "AC Technician": "AC repair and installation",
    "Appliance Repair Technician": "Home appliance repair",
    "Phone Repair Technician": "Phone and tablet repair",
    "Computer Technician": "Computer and laptop repair",
    "Generator Technician": "Generator repair and servicing",
    "Refrigeration Technician": "Fridge and freezer repair",
  };
  return labels[name] || name;
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
  if (marketplaceLoading) {
    resultCount.textContent = "Loading artisans";
    artisanList.innerHTML = `
      <article class="artisan-card loading-card" aria-busy="true">
        <span class="loading-line wide"></span><span class="loading-line"></span><span class="loading-line short"></span>
      </article>
      <article class="artisan-card loading-card" aria-hidden="true">
        <span class="loading-line wide"></span><span class="loading-line"></span><span class="loading-line short"></span>
      </article>`;
    return;
  }

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
                <p>${artisan.category} in ${artisanLocation(artisan)}</p>
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
      .join("") || `<article class="artisan-card empty-marketplace"><h3>${marketplaceLoadError ? "Listings unavailable" : "No verified artisans found"}</h3><p>${
        marketplaceLoadError
          ? "We could not load live listings. Check your connection and refresh the page."
          : "Try another service or LGA/Area Council. New verified artisans are added as coverage grows."
      }</p>${marketplaceLoadError ? '<button class="secondary-action" type="button" data-retry-marketplace>Retry</button>' : ""}</article>`;
}

function initializeJoinSteps() {
  const stepByField = {
    joinName: 1, joinEmail: 1, joinPhone: 1, joinOtp: 1,
    joinTrade: 2, joinState: 2, joinArea: 2, joinTown: 2, joinExperience: 2, joinDetails: 2,
    joinPlan: 3, joinMedia: 3,
    joinNin: 4, joinNinConsent: 4,
  };
  Object.entries(stepByField).forEach(([id, step]) => {
    document.querySelector(`#${id}`)?.closest("label")?.setAttribute("data-join-step", String(step));
  });
  showJoinStep(1);
}

function showJoinStep(step) {
  const titles = ["Your account", "Business and location", "Plan and portfolio", "Identity verification"];
  joinStep = Math.min(4, Math.max(1, step));
  joinForm.querySelectorAll("[data-join-step]").forEach((field) => {
    field.hidden = Number(field.dataset.joinStep) !== joinStep;
  });
  joinOtpField.hidden = joinStep !== 1 || !joinOtpRequestedFor;
  joinStepLabel.textContent = `Step ${joinStep} of 4`;
  joinStepTitle.textContent = titles[joinStep - 1];
  joinProgressBar.style.width = `${joinStep * 25}%`;
  joinBackButton.hidden = joinStep === 1;
  joinNextButton.hidden = joinStep === 4;
  joinSubmitButton.hidden = joinStep !== 4;
  joinNextButton.textContent = joinStep === 1 && joinOtpRequestedFor
    ? "Verify and continue"
    : "Continue";
}

function currentJoinStepIsValid() {
  const fields = [...joinForm.querySelectorAll(`[data-join-step="${joinStep}"] input, [data-join-step="${joinStep}"] select, [data-join-step="${joinStep}"] textarea`)];
  const invalid = fields.find((field) => !field.checkValidity());
  if (invalid) invalid.reportValidity();
  return !invalid;
}

joinNextButton.addEventListener("click", async () => {
  if (!currentJoinStepIsValid()) return;
  if (joinStep === 1 && !(await ensureInlineArtisanSession())) return;
  showJoinStep(joinStep + 1);
});

joinBackButton.addEventListener("click", () => showJoinStep(joinStep - 1));

document.querySelector("#joinEmail").addEventListener("input", () => {
  const email = document.querySelector("#joinEmail").value.trim().toLowerCase();
  if (email === joinOtpRequestedFor) return;
  joinOtpRequestedFor = "";
  joinOtpInput.value = "";
  joinOtpInput.required = false;
  joinOtpField.hidden = true;
  joinNextButton.textContent = "Continue";
});

async function ensureInlineArtisanSession() {
  if (!supabaseClient) {
    setJoinStatus("The account service is unavailable. Try again shortly.", "error");
    return false;
  }

  const fullName = document.querySelector("#joinName").value.trim();
  const email = document.querySelector("#joinEmail").value.trim().toLowerCase();
  const phone = normalizeNigerianPhone(document.querySelector("#joinPhone").value.trim());
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const signedInUser = sessionData.session?.user;

  if (signedInUser) {
    if (signedInUser.email?.toLowerCase() !== email) {
      setJoinStatus(`You are signed in as ${signedInUser.email}. Use that email here or sign out from Account first.`, "error");
      return false;
    }
    try {
      await saveInlineArtisanProfile(signedInUser, { fullName, email, phone });
    } catch (error) {
      setJoinStatus(error.message || "The artisan account could not be prepared.", "error");
      return false;
    }
    joinOtpRequestedFor = "";
    joinOtpInput.value = "";
    joinOtpInput.required = false;
    setJoinStatus("Artisan account confirmed. Continue with your business details.", "success");
    return true;
  }

  if (joinOtpRequestedFor !== email) {
    joinNextButton.disabled = true;
    joinNextButton.textContent = "Sending code...";
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName, phone, role: "artisan" },
      },
    });
    joinNextButton.disabled = false;
    if (error) {
      joinNextButton.textContent = "Continue";
      setJoinStatus(`We could not send the verification code: ${error.message}`, "error");
      return false;
    }

    joinOtpRequestedFor = email;
    joinOtpInput.required = true;
    joinOtpField.hidden = false;
    joinNextButton.textContent = "Verify and continue";
    setJoinStatus(`A six-digit verification code was sent to ${email}. Enter it above to continue.`, "success");
    joinOtpInput.focus();
    return false;
  }

  const token = joinOtpInput.value.trim();
  if (!/^\d{6}$/.test(token)) {
    joinOtpInput.reportValidity();
    setJoinStatus("Enter the six-digit code sent to your email.", "error");
    return false;
  }

  joinNextButton.disabled = true;
  joinNextButton.textContent = "Verifying...";
  const { data, error } = await supabaseClient.auth.verifyOtp({ email, token, type: "email" });
  joinNextButton.disabled = false;
  joinNextButton.textContent = "Verify and continue";
  if (error || !data.user) {
    setJoinStatus(`The verification code could not be confirmed: ${error?.message || "Try requesting a new code."}`, "error");
    return false;
  }

  try {
    await saveInlineArtisanProfile(data.user, { fullName, email, phone });
  } catch (profileError) {
    setJoinStatus(profileError.message || "The artisan account could not be prepared.", "error");
    return false;
  }
  joinOtpRequestedFor = "";
  joinOtpInput.value = "";
  joinOtpInput.required = false;
  setJoinStatus("Email verified and artisan account created. Continue with your business details.", "success");
  return true;
}

async function saveInlineArtisanProfile(user, { fullName, email, phone }) {
  const { error } = await supabaseClient.from("user_profiles").upsert(
    {
      user_id: user.id,
      email,
      full_name: fullName,
      phone,
      role: "artisan",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Artisan profile could not be saved: ${error.message}`);
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
  if (areaFilter.value !== "All") {
    const focusZoom = stateFilter.value === "Lagos" ? 12 : 10;
    if (animateLgaFocus) {
      map.flyTo(activeOrigin, focusZoom, { animate: true, duration: 0.8 });
    } else {
      map.setView(activeOrigin, focusZoom);
    }
  } else if (markers.length === 1) {
    map.setView([matches[0].lat, matches[0].lng], 12);
  } else if (markers.length) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.18));
  } else {
    map.setView(selectedState.center, 11);
  }

  mapStatus.textContent = marketplaceLoading
    ? "Loading verified artisan listings..."
    : `Showing ${matches.length} verified artisan${matches.length === 1 ? "" : "s"} near ${
        activeOriginLabel || stateFilter.value
      }`;
  animateLgaFocus = false;
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
  renderServiceCatalog();
  render();
});

joinState.addEventListener("change", () => {
  saveStateName(joinState.value);
  syncJoinAreas();
});
areaFilter.addEventListener("change", () => {
  saveAreaName(areaFilter.value);
  setSelectedOrigin();
  animateLgaFocus = areaFilter.value !== "All";
  renderServiceCatalog();
  render();
});
serviceSearch.addEventListener("input", render);
sortFilter.addEventListener("change", render);

document.querySelectorAll("[data-marketplace-view]").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.marketplaceView;
    marketplaceViews.classList.toggle("is-map-view", view === "map");
    marketplaceViews.classList.toggle("is-list-view", view === "list");
    document.querySelectorAll("[data-marketplace-view]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    if (view === "map") requestAnimationFrame(() => map.invalidateSize());
  });
});

toggleServicesButton.addEventListener("click", () => {
  showAllServices = !showAllServices;
  renderServiceCatalog();
});

categoryGrid.addEventListener("click", (event) => {
  const serviceCard = event.target.closest("[data-service-category]");
  if (!serviceCard) return;
  serviceSearch.value = serviceCard.dataset.serviceCategory;
  render();
  document.querySelector("#marketplace").scrollIntoView({ behavior: "smooth", block: "start" });
});

artisanList.addEventListener("click", async (event) => {
  if (!event.target.closest("[data-retry-marketplace]")) return;
  marketplaceLoading = true;
  marketplaceLoadError = "";
  render();
  await Promise.all([loadRealArtisans(), loadTrustSignals()]);
  render();
});

document.querySelectorAll("[data-state]").forEach((button) => {
  button.addEventListener("click", () => {
    stateFilter.value = button.dataset.state;
    joinState.value = button.dataset.state;
    syncAreas();
    syncJoinAreas();
    renderServiceCatalog();
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
    setSelectedOrigin();
    render();
    mapStatus.textContent = "Location access is not available in this browser. Showing the selected LGA/Area Council instead.";
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
      setSelectedOrigin();
      render();
      mapStatus.textContent = "Location permission was not granted. Showing the selected LGA/Area Council instead.";
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
  const quoteUserId = await currentUserId();
  if (mediaFiles.length && !quoteUserId) {
    setQuoteStatus("Sign in to attach private job photos or videos. You can still send a request without media.", "error");
    return;
  }
  const payload = {
    request_code: requestId,
    artisan_id: selectedQuoteArtisan.id,
    artisan_name: selectedQuoteArtisan.name,
    artisan_category: selectedQuoteArtisan.category,
    artisan_state: selectedQuoteArtisan.state,
    artisan_area: selectedQuoteArtisan.area,
    artisan_lga: selectedQuoteArtisan.area,
    artisan_town: selectedQuoteArtisan.town || "",
    customer_name: document.querySelector("#quoteName").value.trim(),
    customer_phone: document.querySelector("#quotePhone").value.trim(),
    job_location: document.querySelector("#quoteLocation").value.trim(),
    urgency: document.querySelector("#quoteUrgency").value,
    job_details: document.querySelector("#quoteDetails").value.trim(),
    customer_user_id: quoteUserId,
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

  let { error } = await insertWithTimeout("quote_requests", payload);
  if (error && isMissingLocationColumn(error)) {
    delete payload.artisan_lga;
    delete payload.artisan_town;
    ({ error } = await insertWithTimeout("quote_requests", payload));
  }

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
    bucket: "fixam-private-media",
    visibility: "private",
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

  if (!supabaseClient) {
    setJoinStatus("The account service is unavailable. Try again shortly.", "error");
    return;
  }
  const applicantUserId = await currentUserId();
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!applicantUserId || !sessionData.session?.user) {
    setJoinStatus("Sign in or create an artisan account before submitting identity information.", "error");
    return;
  }

  const applicationCode = `F9-A-${Date.now().toString().slice(-6)}`;
  const mediaFiles = selectedFiles("#joinMedia");
  const fullName = document.querySelector("#joinName").value.trim();
  const applicantEmail = document.querySelector("#joinEmail").value.trim().toLowerCase();
  const normalizedPhone = normalizeNigerianPhone(document.querySelector("#joinPhone").value.trim());
  const nin = document.querySelector("#joinNin").value.trim();
  const hasNinConsent = document.querySelector("#joinNinConsent").checked;

  if (applicantEmail !== sessionData.session.user.email?.toLowerCase()) {
    setJoinStatus("Use the same email address as your signed-in FixAm 9ja account.", "error");
    return;
  }

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

  const payload = {
    application_code: applicationCode,
    full_name: fullName,
    applicant_email: applicantEmail,
    trade: joinTrade.value,
    state: joinState.value,
    area: joinArea.value,
    lga: joinArea.value,
    town: joinTown.value.trim(),
    phone: normalizedPhone,
    preferred_plan: document.querySelector("#joinPlan").value,
    years_experience: Number(document.querySelector("#joinExperience").value),
    work_summary: `${document.querySelector("#joinDetails").value.trim()}\n\nLocation: ${joinTown.value.trim()}, ${joinArea.value}, ${joinState.value}`,
    applicant_user_id: applicantUserId,
    nin_last4: nin.slice(-4),
    nin_consent: hasNinConsent,
    nin_consent_at: new Date().toISOString(),
    liveness_consent: hasNinConsent,
    liveness_consent_at: new Date().toISOString(),
    identity_verification_status: "pending",
    verification_media_count: 0,
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

  let { error } = await insertWithTimeout("artisan_applications", payload);
  if (error && isMissingLocationColumn(error)) {
    delete payload.lga;
    delete payload.town;
    ({ error } = await insertWithTimeout("artisan_applications", payload));
  }

  if (error) {
    setJoinStatus(formatSubmitError(error), "error");
    joinSubmitButton.textContent = "Try again";
    joinSubmitButton.disabled = false;
    return;
  }

  setJoinStatus("Application received. Preparing the secure QoreID identity check...", "");
  const verificationResult = await verifyNinForApplication({
    applicationCode,
    applicantEmail,
    fullName,
    phone: payload.phone,
    nin,
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
    nin,
    applicationCode,
    plan: payload.subscription_plan,
    fullName,
    email: applicantEmail,
    phone: payload.phone,
    retryVerification: {
      applicationCode,
      applicantEmail,
      fullName,
      phone: payload.phone,
      nin,
    },
  };
  if (!foundingLaunchFree) {
    nextAction.amount = payload.subscription_amount;
  }
  setJoinStatus(finalMessage, finalType, nextAction);
  joinSubmitButton.textContent = "Application sent";
  joinForm.reset();
  syncJoinAreas();
  showJoinStep(1);
});

async function verifyNinForApplication({ applicationCode, applicantEmail, fullName, phone, nin }) {
  if (!supabaseClient) return { status: "pending", message: "Supabase is not configured." };

  const { data, error } = await supabaseClient.functions.invoke("verify-nin", {
    body: {
      application_code: applicationCode,
      applicant_email: applicantEmail,
      full_name: fullName,
      phone,
      nin,
      liveness_consent: true,
      consent: true,
    },
  });

  if (error) {
    let detail = "";
    try {
      const errorBody = await error.context?.json?.();
      detail = String(errorBody?.error || errorBody?.message || "").trim();
    } catch (_parseError) {
      detail = "";
    }
    return {
      status: "failed",
      message: detail
        ? `The secure identity check could not start: ${detail}`
        : "The secure identity check could not start. Please retry or contact verification@fixam9ja.com.",
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
    return `${result.message || "Identity verification could not be completed."} FixAm 9ja will review it manually. Contact verification@fixam9ja.com if you need help.`;
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
  if (!supabaseClient) {
    artisans = [];
    marketplaceLoading = false;
    marketplaceLoadError = "Marketplace connection is not configured.";
    return;
  }

  const legacyColumns = "id, state, area, category, business_name, lat, lng, rating, jobs, response_time, plan, subscription_plan, subscription_status, bio, skills, availability, service_radius, completed_jobs, verification_status, verification_checks, portfolio_items, profile_status";
  const fetchArtisans = (columns) => supabaseClient
      .from("artisans")
      .select(columns)
      .eq("profile_status", "active")
      .eq("verification_status", "verified")
      .in("subscription_status", ["active", "founding", "free_trial"])
      .order("business_name");

  let { data, error } = await fetchArtisans(`${legacyColumns}, lga, town`);
  if (error && isMissingLocationColumn(error)) {
    ({ data, error } = await fetchArtisans(legacyColumns));
  }

  if (error) {
    artisans = [];
    marketplaceLoading = false;
    marketplaceLoadError = error.message || "Unable to load listings.";
    syncAreas();
    renderServiceCatalog();
    return;
  }

  artisans = (data || []).map((artisan) => ({
    id: artisan.id,
    state: artisan.state,
    area: locationDirectory.normalizeLga?.(artisan.state, artisan.lga || artisan.area) || artisan.lga || artisan.area,
    town: artisan.town || "",
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

  marketplaceLoading = false;
  marketplaceLoadError = "";

  syncAreas();
  renderServiceCatalog();
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
  const canRetryVerification = typeof action === "object" && action?.retryVerification;
  const canRequestSubscription = typeof action === "object" && action?.applicationCode && action?.amount;

  if (sdkSessionToken) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-action-link";
    button.textContent = "Start identity check";
    button.addEventListener("click", () => launchQoreIdCollection(action));
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

  if (canRetryVerification && !sdkSessionToken && !actionUrl) {
    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "status-action-link";
    retryButton.textContent = "Retry secure identity check";
    retryButton.addEventListener("click", () => retryIdentityVerification(action, retryButton));
    joinNote.appendChild(document.createElement("br"));
    joinNote.appendChild(retryButton);
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

async function retryIdentityVerification(action, button) {
  button.disabled = true;
  button.textContent = "Preparing identity check...";
  const result = await verifyNinForApplication(action.retryVerification);
  const nextAction = {
    ...action,
    url: result.verification_url,
    sdkSessionToken: result.sdk_session_token,
    reference: result.reference || action.applicationCode,
  };

  if (result.status === "failed" || (!nextAction.sdkSessionToken && !nextAction.url)) {
    setJoinStatus(
      result.message || "The secure identity check could not start. Please try again.",
      "error",
      nextAction,
    );
    return;
  }

  setJoinStatus(result.message || "The secure identity check is ready.", "success", nextAction);
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
      `Subscription activation could not be saved yet: ${error.message}. Ask an administrator to check the subscription database setup, then try again.`,
      "error",
      action,
    );
    return;
  }

  setJoinStatus(
    `Subscription activation request ${requestCode} saved. FixAm 9ja will confirm payment setup before public listing. Contact payments@fixam9ja.com for billing support.`,
    "success",
  );
}

async function launchQoreIdCollection(action) {
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
      identityData: {
        idType: "nin",
        idNumber: action.nin,
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

function artisanLocation(artisan) {
  return [artisan.town, artisan.area].filter(Boolean).join(", ");
}

function isMissingLocationColumn(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("artisan_lga") || message.includes("artisan_town") || message.includes("column 'lga'") || message.includes("column 'town'") || message.includes("schema cache");
}

function openProfile(artisan) {
  profileContent.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar">${artisan.initials}</div>
      <div>
        <p class="eyebrow">${artisan.category} in ${artisanLocation(artisan)}</p>
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
          .map((item) => `<article><strong>${item}</strong><small>${artisanLocation(artisan)}, ${artisan.state}</small></article>`)
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
  quoteArtisanText.textContent = `Requesting ${artisan.category.toLowerCase()} support from ${artisan.name} in ${artisanLocation(artisan)}, ${artisan.state}.`;
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
