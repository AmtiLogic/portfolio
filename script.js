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
    const cap = fig.querySelector("figcaption");
    const strong = cap.querySelector("strong");
    return {
      src: link.getAttribute("href"),
      alt: fig.querySelector("img").alt,
      title: strong.textContent,
      text: cap.textContent.slice(strong.textContent.length).trim(),
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
    const grid = fig.closest(".grid");
    const figs = Array.from(grid.querySelectorAll(".item"));
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

  document.querySelectorAll(".item a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      open(a.closest(".item"));
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
