function inspectPresentation({checkTouchTargets = false} = {}) {
  const root = document.querySelector("dialog[open]") || document.querySelector("#appShell:not(.hidden)") || document.querySelector("#authScreen");
  const findings = [];
  const seen = new Set();
  const rgb = value => {
    const numbers = String(value).match(/[\d.]+/g)?.map(Number);
    return /rgba?\(/.test(value) && numbers?.length >= 3 ? [...numbers.slice(0, 3), numbers[3] ?? 1] : null;
  };
  const blend = (front, back) => front.slice(0, 3).map((channel, index) => channel * front[3] + back[index] * (1 - front[3]));
  const luminance = color => color.slice(0, 3).map(channel => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const background = element => {
    const layers = [];
    for (let parent = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const color = rgb(style.backgroundColor);
      const stops = /gradient\(/.test(style.backgroundImage)
        ? (style.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgb).filter(Boolean) : [];
      if (stops.length) layers.push(stops);
      if (color) layers.push([color]);
      if (color?.[3] === 1 || stops.length && stops.every(stop => stop[3] === 1)) break;
    }
    return layers.reverse().reduce((backs, fronts) => backs.flatMap(back => fronts.map(front => blend(front, back))), [[255, 255, 255]]);
  };
  const rendered = element => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0
      && element.checkVisibility({checkOpacity:true, checkVisibilityCSS:true});
  };
  const visible = element => {
    const box = element.getBoundingClientRect();
    return rendered(element) && box.right > 0 && box.left < innerWidth;
  };
  const identify = element => element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}.${Array.from(element.classList).join(".")}`;
  const add = (kind, element, detail, text = "") => {
    const key = `${kind}|${identify(element)}|${detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({kind, element:identify(element), detail, text:String(text).trim().slice(0, 70)});
  };
  const contrast = (element, style, text, color = style.webkitTextFillColor || style.color) => {
    const foreground = rgb(color);
    if (!foreground) return add("unknown-color", element, color, text);
    const ratio = Math.min(...background(element).map(base => {
      const levels = [luminance(blend(foreground, base)), luminance(base)].sort((a,b)=>a-b);
      return (levels[1] + .05) / (levels[0] + .05);
    }));
    const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
    if (ratio + .01 < (large ? 3 : 4.5)) add("contrast", element, `${ratio.toFixed(2)}:1 ${color}`, text);
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement, text = node.textContent.trim();
    if (!text || !element || /^(SCRIPT|STYLE|OPTION)$/.test(element.tagName)
      || element.closest('[aria-hidden="true"], .sr-only') || !visible(element)) continue;
    const style = getComputedStyle(element), size = parseFloat(style.fontSize);
    if (!size) continue;
    if (size < 12) add("small-text", element, `${size}px`, text);
    contrast(element, style, text);
    if (element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1
      && ["hidden", "clip"].includes(style.overflowX)) add("clipped-text", element, `${element.scrollWidth}/${element.clientWidth}px`, text);
  }
  const icon = element => {
    const hasMask = style => style.display !== "none" && style.maskImage !== "none" && parseFloat(style.width) > 0;
    return hasMask(getComputedStyle(element, "::before")) || hasMask(getComputedStyle(element, "::after"))
      || Array.from(element.querySelectorAll("svg, img, span")).some(child => rendered(child) && (child.matches("svg,img") || hasMask(getComputedStyle(child))));
  };
  for (const element of [root, ...root.querySelectorAll("*")]) {
    if (!visible(element)) continue;
    const style = getComputedStyle(element);
    if (checkTouchTargets && document.documentElement.clientWidth <= 720
      && element.matches('button, summary, [role="button"], a.ghost-button, a.primary-button, a.small-action')) {
      const box = element.getBoundingClientRect();
      if (box.width < 43.5 || box.height < 43.5) {
        add("small-touch-target", element, `${box.width.toFixed(1)} x ${box.height.toFixed(1)}px < 44px`, element.textContent);
      }
    }
    if (/blur\(/.test(`${style.filter} ${style.backdropFilter}`)) add("blur", element, `${style.filter} / ${style.backdropFilter}`);
    if (/gradient\(/.test(style.backgroundImage) && !element.matches("#mobileSidebar, #authScreen .auth-hero")) add("gradient", element, style.backgroundImage);
    if (element.matches('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), select, textarea')) {
      const size = parseFloat(style.fontSize), minimum = innerWidth <= 720 ? 16 : 14;
      if (size < minimum) add("small-control", element, `${size}px < ${minimum}px`);
      contrast(element, style, "Form value");
    }
    if (element.matches("button, a.ghost-button, a.primary-button, a.small-action")) {
      const isRecord = element.matches('.activity-card-button, [data-lead-id], [data-dashboard-activity-lead], .salesman-call-next-item, .salesman-first-touch-item, .salesman-loss-item');
      if (!isRecord && !icon(element)) add("missing-icon", element, "No visible SVG, bitmap or masked icon", element.textContent);
      if (/^[×x‹›<>⋯…+\-]$/.test(element.textContent.trim()) && !element.getAttribute("aria-label") && !element.title) add("icon-name", element, "Icon-only control needs a descriptive name", element.textContent);
    }
  }
  const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const viewportWidth = document.documentElement.clientWidth || innerWidth;
  if (pageWidth > viewportWidth + 1) findings.push({kind:"page-overflow",detail:`${pageWidth}/${viewportWidth}px`});
  return findings;
}

module.exports = { inspectPresentation };
