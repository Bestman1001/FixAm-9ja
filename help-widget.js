(function () {
  const topics = [
    {
      title: "How customers request a quote",
      keywords: ["customer", "quote", "request", "job", "photos"],
      answer:
        "Choose your state, LGA/Area Council, and service, then open an artisan profile and select Request quote. Add your name, phone number, job location, urgency, job details, and photos or videos if useful. The artisan sees the lead in their account dashboard."
    },
    {
      title: "How artisans join FixAm 9ja",
      keywords: ["artisan", "register", "join", "onboarding", "profile"],
      answer:
        "Use Join as Artisan, enter your email, trade, state, LGA/Area Council, town or neighbourhood, Nigerian phone number, NIN, selfie/liveness proof, experience, work summary, and portfolio media. Founding artisans can apply before paid subscriptions fully begin."
    },
    {
      title: "NIN and liveness verification",
      keywords: ["nin", "identity", "verification", "liveness", "selfie", "qoreid"],
      answer:
        "Artisans may be asked to complete NIN and selfie/liveness checks for trust and safety. A successful check helps the profile earn a verified identity badge. If an automated check cannot complete, FixAm 9ja may review the application manually."
    },
    {
      title: "Accepting or declining quote leads",
      keywords: ["accept", "decline", "contacted", "lead", "artisan"],
      answer:
        "Artisans can open quote leads from the account dashboard and choose Accept job, Mark contacted, or Decline. Customers see customer-side actions such as cancelling, marking work completed, or reviewing after the job."
    },
    {
      title: "Customer and artisan accounts",
      keywords: ["login", "account", "password", "magic", "email"],
      answer:
        "Accounts use email sign-in. Customers and artisans can use the Accounts page to sign in, track requests, manage profiles, view quote leads, and upload proof of work."
    },
    {
      title: "Reviews and ratings",
      keywords: ["review", "rating", "stars", "bad", "complaint"],
      answer:
        "Reviews are between customers and artisans for transparency. Admin does not edit honest reviews, but FixAm 9ja may remove fake, abusive, threatening, or private-information content and may suspend artisans with serious quality or safety issues."
    },
    {
      title: "Subscriptions and founding artisans",
      keywords: ["subscription", "payment", "plan", "monthly", "founding"],
      answer:
        "The launch plan is to let early verified artisans build trust and visibility before strict paid subscription enforcement. Paid plans can later unlock priority placement, quote access, analytics, and higher local visibility."
    },
    {
      title: "States, areas, and map location",
      keywords: ["state", "lga", "area council", "town", "map", "location", "radius", "near"],
      answer:
        "The marketplace remembers the selected state and LGA/Area Council where possible. It uses LGA and artisan profile coordinates to show local results and estimate distance, while town or neighbourhood gives customers more precise context."
    },
    {
      title: "Uploading photos and videos",
      keywords: ["upload", "media", "photo", "video", "portfolio"],
      answer:
        "Customers can attach photos or videos to quote requests. Artisans can upload portfolio media to show proof of work. Files should be relevant, safe, and should not expose private information without permission."
    },
    {
      title: "Safety and disputes",
      keywords: ["safety", "dispute", "scam", "money", "problem"],
      answer:
        "Agree scope, price, materials, and timing before work starts. Keep communication clear and avoid paying large sums without proof of work. Report suspicious behaviour so FixAm 9ja can review the account."
    }
  ];

  function findTopic(query) {
    const text = query.trim().toLowerCase();
    if (!text) return topics[0];
    return (
      topics.find((topic) =>
        topic.keywords.some((keyword) => text.includes(keyword)) ||
        topic.title.toLowerCase().includes(text)
      ) || {
        title: "I can help with FixAm 9ja basics",
        answer:
          "Try asking about quote requests, artisan registration, NIN verification, accepting jobs, customer reviews, subscriptions, media uploads, states, areas, or account login."
      }
    );
  }

  function renderAnswer(container, topic) {
    container.innerHTML = `
      <strong>${topic.title}</strong>
      <p>${topic.answer}</p>
    `;
  }

  function initHelpWidget() {
    if (document.querySelector("[data-fixam-help-widget]")) return;

    const button = document.createElement("button");
    button.className = "fixam-help-button";
    button.type = "button";
    button.textContent = "Help";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "fixamHelpPanel");

    const panel = document.createElement("section");
    panel.className = "fixam-help-panel";
    panel.id = "fixamHelpPanel";
    panel.hidden = true;
    panel.setAttribute("data-fixam-help-widget", "");
    panel.innerHTML = `
      <div class="fixam-help-header">
        <div>
          <strong>FixAm 9ja help</strong>
          <span>Fast answers for customers and artisans</span>
        </div>
        <button class="fixam-help-close" type="button">Close</button>
      </div>
      <div class="fixam-help-body">
        <input class="fixam-help-search" type="search" placeholder="Ask about quotes, NIN, reviews..." aria-label="Search FixAm 9ja help" />
        <div class="fixam-help-chips"></div>
        <div class="fixam-help-answer" aria-live="polite"></div>
        <div class="fixam-help-links">
          <a href="help.html">How-to guide</a>
          <a href="policies.html">Policies</a>
          <a href="disclaimer.html">Disclaimer</a>
        </div>
      </div>
    `;

    document.body.append(button, panel);

    const closeButton = panel.querySelector(".fixam-help-close");
    const search = panel.querySelector(".fixam-help-search");
    const chips = panel.querySelector(".fixam-help-chips");
    const answer = panel.querySelector(".fixam-help-answer");
    const quickTopics = topics.slice(0, 5);

    quickTopics.forEach((topic) => {
      const chip = document.createElement("button");
      chip.className = "fixam-help-chip";
      chip.type = "button";
      chip.textContent = topic.title.replace("How ", "");
      chip.addEventListener("click", () => {
        search.value = topic.title;
        renderAnswer(answer, topic);
      });
      chips.appendChild(chip);
    });

    renderAnswer(answer, topics[0]);

    button.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) search.focus();
    });

    closeButton.addEventListener("click", () => {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.focus();
    });

    search.addEventListener("input", () => renderAnswer(answer, findTopic(search.value)));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHelpWidget);
  } else {
    initHelpWidget();
  }
})();
