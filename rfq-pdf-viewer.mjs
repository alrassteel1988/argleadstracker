import { getDocument, GlobalWorkerOptions } from "/assets/pdfjs/build/pdf.min.mjs";

GlobalWorkerOptions.workerSrc = "/assets/pdfjs/build/pdf.worker.min.mjs";

export async function renderPrivatePdf({ blob, container, signal, isCurrent }) {
  let loading, pdf, rendering, observer, disposed = false, revision = 0;
  const active = () => !disposed && !signal.aborted && isCurrent() && container.isConnected;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    revision++;
    observer?.disconnect();
    rendering?.cancel();
    loading?.destroy().catch(() => {});
  };
  signal.addEventListener("abort", dispose, { once: true });
  if (!active()) { dispose(); return dispose; }
  try {
    const data = new Uint8Array(await blob.arrayBuffer());
    if (!active()) return dispose;
    loading = getDocument({ data, standardFontDataUrl: "/assets/pdfjs/standard_fonts/",
      cMapUrl: "/assets/pdfjs/cmaps/", cMapPacked: true, wasmUrl: "/assets/pdfjs/wasm/",
      useWasm: false, enableXfa: false, disableFontFace: true, disableWorkerRendering: true, isEvalSupported: false,
      maxImageSize: 16000000, canvasMaxAreaInBytes: 64000000 });
    loading.onPassword = () => {
      if (active()) container.querySelector("[role=status]").textContent = "Password-protected PDFs cannot be previewed. Use Download to open privately.";
      dispose();
    };
    pdf = await loading.promise;
    if (!active()) { dispose(); return dispose; }
    if (pdf.numPages > 500) throw new Error("This PDF exceeds the preview page limit. Use Download to open it privately.");
    container.innerHTML = `<div class="mg-pdf-toolbar" role="group" aria-label="PDF pages">
      <button type="button" class="ghost-button" data-pdf-previous aria-label="Previous PDF page" title="Previous page">&lsaquo;</button>
      <span data-pdf-pages aria-live="polite"></span>
      <button type="button" class="ghost-button" data-pdf-next aria-label="Next PDF page" title="Next page">&rsaquo;</button>
      <select data-pdf-zoom aria-label="PDF zoom"><option value="1">Fit width</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option></select></div>
      <p role="status">Rendering PDF...</p><div class="mg-pdf-paper"><canvas aria-label="PDF page"></canvas></div>`;
    const canvas = container.querySelector("canvas"), paper = container.querySelector(".mg-pdf-paper");
    const previous = container.querySelector("[data-pdf-previous]"), next = container.querySelector("[data-pdf-next]");
    const zoom = container.querySelector("[data-pdf-zoom]"), status = container.querySelector("[role=status]");
    let pageNumber = 1, measuredWidth = 0;
    const render = async () => {
      const current = ++revision;
      rendering?.cancel();
      previous.disabled = next.disabled = true;
      canvas.removeAttribute("data-pdf-rendered");
      status.textContent = "Rendering PDF...";
      try {
        const page = await pdf.getPage(pageNumber);
        if (!active() || current !== revision) return;
        const base = page.getViewport({ scale: 1 });
        measuredWidth = paper.clientWidth;
        const scale = Math.max(0.1, (measuredWidth - 2) / base.width) * Number(zoom.value);
        const viewport = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(16000000 / (viewport.width * viewport.height)));
        canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
        canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        rendering = page.render({ canvasContext: canvas.getContext("2d"), viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
        await rendering.promise;
        if (!active() || current !== revision) return;
        canvas.dataset.pdfRendered = "true";
        canvas.setAttribute("aria-label", `PDF page ${pageNumber} of ${pdf.numPages}`);
        container.querySelector("[data-pdf-pages]").textContent = `${pageNumber} / ${pdf.numPages}`;
        status.textContent = "";
        previous.disabled = pageNumber === 1;
        next.disabled = pageNumber === pdf.numPages;
      } catch (error) {
        if (active() && current === revision && error.name !== "RenderingCancelledException") {
          status.textContent = "This PDF page could not be rendered. Use Download to open it privately.";
        }
      }
    };
    previous.addEventListener("click", () => { if (pageNumber > 1) { pageNumber--; void render(); } });
    next.addEventListener("click", () => { if (pageNumber < pdf.numPages) { pageNumber++; void render(); } });
    zoom.addEventListener("change", () => { void render(); });
    observer = new ResizeObserver(() => { if (active() && Math.abs(paper.clientWidth - measuredWidth) > 1) void render(); });
    observer.observe(paper);
    await render();
  } catch (error) {
    if (active()) container.querySelector("[role=status]").textContent = error.message?.includes("preview page limit")
      ? error.message : "This PDF could not be previewed. Use Download to open it privately.";
    dispose();
  }
  return dispose;
}
