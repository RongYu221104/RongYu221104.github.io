const DISCLOSURE_DURATION_MS = 180;

function initializeDisclosureMotion(): void {
  document.querySelectorAll<HTMLDetailsElement>("details[data-disclosure-motion]").forEach((details) => {
    if (details.dataset.motionReady === "true") return;
    const summary = details.querySelector<HTMLElement>(":scope > summary");
    const content = summary?.nextElementSibling as HTMLElement | null;
    if (!summary || !content) return;
    details.dataset.motionReady = "true";

    let sizeAnimation: Animation | null = null;
    let contentAnimation: Animation | null = null;

    summary.addEventListener("click", (event) => {
      event.preventDefault();
      sizeAnimation?.finish();
      contentAnimation?.finish();

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        details.open = !details.open;
        return;
      }

      const opening = !details.open;
      const startHeight = details.offsetHeight;
      if (opening) details.open = true;
      const endHeight = opening ? details.offsetHeight : summary.offsetHeight;
      details.style.overflow = "hidden";

      sizeAnimation = details.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: DISCLOSURE_DURATION_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      contentAnimation = content.animate(
        opening
          ? [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }]
          : [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-5px)" }],
        { duration: opening ? DISCLOSURE_DURATION_MS : 150, easing: "ease-out", fill: "both" },
      );

      sizeAnimation.addEventListener("finish", () => {
        if (!opening) details.open = false;
        details.style.removeProperty("height");
        details.style.removeProperty("overflow");
        sizeAnimation = null;
      }, { once: true });
      contentAnimation.addEventListener("finish", () => {
        contentAnimation?.cancel();
        contentAnimation = null;
      }, { once: true });
    });
  });
}

initializeDisclosureMotion();
document.addEventListener("astro:page-load", initializeDisclosureMotion);
