// Justified rows: fill each row with pieces until it reaches the container width,
// then scale that row so it fits exactly. Every image keeps its own ratio.
(function () {
  const walks = document.querySelectorAll(".walk");

  function layout(walk) {
    const style = getComputedStyle(walk);
    const W = walk.clientWidth;
    const H = parseFloat(style.getPropertyValue("--row")) || 340;
    const gap = parseFloat(style.columnGap) || 0;
    const pieces = Array.from(walk.querySelectorAll(".piece"));

    function setRow(row, h) {
      row.forEach(function (p) {
        p.style.width = (p._r * h) + "px";
      });
    }
    function fit(row) {
      const sum = row.reduce(function (s, p) { return s + p._r; }, 0);
      // Shave a pixel so sub-pixel rounding never pushes the last tile onto a new line.
      return (W - 1 - gap * (row.length - 1)) / sum;
    }

    let row = [];
    pieces.forEach(function (p) {
      p._r = parseFloat(p.style.getPropertyValue("--r"));
      row.push(p);
      const sum = row.reduce(function (s, q) { return s + q._r; }, 0);
      const width = sum * H + gap * (row.length - 1);
      if (width < W) return;
      // Row is full: keep the last piece if that lands closer to the target height.
      const without = (sum - p._r) * H + gap * (row.length - 2);
      if (row.length > 1 && W - without < width - W) {
        row.pop();
        setRow(row, fit(row));
        row = [p];
      } else {
        setRow(row, fit(row));
        row = [];
      }
    });
    // A short last row keeps the normal height instead of stretching.
    if (row.length) setRow(row, Math.min(H, fit(row)));
    walk.classList.add("justified");
  }

  function all() { walks.forEach(layout); }
  all();
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(function () { all(); });
    walks.forEach(function (w) { ro.observe(w); });
  } else {
    window.addEventListener("resize", all);
  }
})();

// Fade each piece in as it scrolls into view.
(function () {
  const pieces = document.querySelectorAll(".piece");
  if (!("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js");
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  pieces.forEach(function (p) { io.observe(p); });
})();

// Lightbox: click an image to view it full-screen; arrows/swipe move within its project.
(function () {
  const box = document.getElementById("lightbox");
  const img = box.querySelector(".lb-img");
  const title = box.querySelector(".lb-title");
  const text = box.querySelector(".lb-text");
  const count = box.querySelector(".lb-count");
  const prevBtn = box.querySelector(".lb-prev");
  const nextBtn = box.querySelector(".lb-next");
  const closeBtn = box.querySelector(".lb-close");

  let items = [];
  let index = 0;
  let opener = null;

  function readItem(fig) {
    const link = fig.querySelector("a");
    return {
      src: link.getAttribute("href"),
      alt: fig.querySelector("img").alt,
      title: fig.querySelector(".label strong").textContent,
      text: fig.querySelector(".label .cap").textContent,
    };
  }

  function show(i) {
    index = i;
    const item = items[i];
    // Hide the previous image until the new one has loaded, so title and image never mismatch.
    img.style.opacity = 0;
    img.onload = function () { img.style.opacity = 1; };
    img.src = item.src;
    img.alt = item.alt;
    title.textContent = item.title;
    text.textContent = item.text;
    count.textContent = (i + 1) + " / " + items.length;
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === items.length - 1;
    // Preload neighbours so arrow navigation feels instant.
    [i - 1, i + 1].forEach(function (n) {
      if (items[n]) new Image().src = items[n].src;
    });
  }

  function open(fig) {
    const walk = fig.closest(".walk");
    const figs = Array.from(walk.querySelectorAll(".piece"));
    items = figs.map(readItem);
    opener = fig.querySelector("a");
    box.hidden = false;
    document.body.classList.add("lb-open");
    show(figs.indexOf(fig));
    closeBtn.focus();
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove("lb-open");
    img.removeAttribute("src");
    if (opener) opener.focus();
  }

  function step(d) {
    const n = index + d;
    if (n >= 0 && n < items.length) show(n);
  }

  document.querySelectorAll(".piece .frame").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      open(a.closest(".piece"));
    });
  });

  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });
  closeBtn.addEventListener("click", close);

  // Click on the dark backdrop (not the image or controls) closes.
  box.addEventListener("click", function (e) {
    if (e.target === box || e.target.classList.contains("lb-figure")) close();
  });

  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const focusable = [closeBtn, prevBtn, nextBtn].filter(function (b) {
        return !b.disabled && b.offsetParent !== null;
      });
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Swipe left/right. Ignore multi-touch so pinch-zoom still works.
  let startX = null, startY = null;
  box.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { startX = null; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
})();
