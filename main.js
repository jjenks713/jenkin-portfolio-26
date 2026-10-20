// Waveform ridgelines behind the page, the typed role line, and active-section tracking for the nav.

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

(function ridgelines() {
  const canvas = document.getElementById("sound");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const BG = "#08191a";
  const LINES = 24;

  // Seeded random so the "mountain range" is the same on every visit.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // Each line gets a few gaussian peaks, clustered toward the middle like a range of mountains,
  // or the loud part of a waveform.
  const lines = Array.from({ length: LINES }, (_, i) => {
    const count = 3 + Math.floor(rand() * 3);
    return Array.from({ length: count }, () => ({
      x: 0.18 + rand() * 0.5,
      w: 0.015 + rand() * 0.05,
      h: 0.4 + rand() * 0.6,
      speed: 0.6 + rand() * 1.2,
      phase: rand() * Math.PI * 2,
      line: i,
    }));
  });

  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    const top = height * 0.5;
    const gap = (height * 0.48) / LINES;
    const peakScale = Math.min(110, height * 0.13);

    // Back to front: each line is filled with the background so it hides the lines behind it.
    lines.forEach((peaks, i) => {
      const base = top + i * gap;
      const points = [];
      for (let x = 0; x <= width; x += 4) {
        const u = x / width;
        let y = 0;
        for (const p of peaks) {
          const pulse = still ? 1 : 0.7 + 0.3 * Math.sin(t * 0.0012 * p.speed + p.phase);
          y += p.h * pulse * Math.exp(-((u - p.x) ** 2) / (2 * p.w * p.w));
        }
        const envelope = Math.exp(-((u - 0.42) ** 2) / 0.06);
        const jitter = still ? 0 : Math.sin(x * 0.09 + t * 0.003 + i * 1.7) * 0.06 * envelope;
        points.push(x, base - (y + jitter) * peakScale * envelope);
      }

      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        for (let k = 2; k < points.length; k += 2) ctx.lineTo(points[k], points[k + 1]);
      };

      trace();
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = BG;
      ctx.fill();

      // every fourth line in copper, like the emphasized lines on a chart or a meter's peak marks
      trace();
      ctx.strokeStyle = i % 4 === 0 ? "rgba(232, 121, 59, 0.34)" : "rgba(159, 216, 196, 0.18)";
      ctx.lineWidth = i % 4 === 0 ? 1.2 : 1;
      ctx.stroke();
    });

    if (!still) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    if (still) draw(0);
  });
  draw(0);
})();

(function typedRole() {
  const role = document.querySelector(".role");
  const out = role && role.querySelector(".typed");
  if (!out) return;

  const passes = ["Music Producer", "Mixing Engineer", "Gamer", "Game Dev in Training"];
  const final = out.textContent.trim();
  const land = () => role.classList.add("landed");

  if (still) return land();

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function type(text) {
    for (let i = 1; i <= text.length; i++) {
      out.textContent = text.slice(0, i);
      await wait(48 + Math.random() * 40);
    }
  }

  async function erase() {
    while (out.textContent.length) {
      out.textContent = out.textContent.slice(0, -1);
      await wait(22);
    }
  }

  (async () => {
    role.classList.add("typing");
    out.textContent = "";
    await wait(500);
    for (const word of passes) {
      await type(word);
      await wait(650);
      await erase();
      await wait(160);
    }
    await type(final);
    role.classList.remove("typing");
    land();
  })();
})();

(function activeNav() {
  const links = [...document.querySelectorAll(".nav a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) return;

  let lockedUntil = 0;

  function setActive(id) {
    links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === id));
  }

  // The current section is the last one whose top has passed 40% of the viewport.
  // At the very bottom of the page, the last section wins even if it's short.
  function update() {
    if (Date.now() < lockedUntil) return;
    const line = window.innerHeight * 0.4;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) current = section;
    }
    if (atBottom) current = sections[sections.length - 1];
    setActive(`#${current.id}`);
  }

  // A click marks its link right away, and holds it while the smooth scroll settles.
  links.forEach((link) =>
    link.addEventListener("click", () => {
      setActive(link.getAttribute("href"));
      lockedUntil = Date.now() + 900;
    })
  );

  let queued = false;
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", update);
  update();
})();

// Only one case study open at a time. Browsers that support <details name> already do this;
// this covers the ones that don't.
(function oneCaseStudy() {
  const studies = [...document.querySelectorAll("details[name='case-study']")];
  studies.forEach((study) =>
    study.addEventListener("toggle", () => {
      if (!study.open) return;
      studies.forEach((other) => {
        if (other !== study) other.open = false;
      });
    })
  );
})();
