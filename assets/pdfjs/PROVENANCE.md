# PDF.js 6.5.438

Source: official npm package `pdfjs-dist@6.5.438`, published by Mozilla's PDF.js
project: https://github.com/mozilla/pdf.js and https://www.npmjs.com/package/pdfjs-dist.

Registry archive integrity:
`sha512-vg8Pw1x+AFKy4AMDvhuWl5cOYV8d698UoEANoFFhc79hqXDnZQqnOXoxw3HG907WHOg1JYOvLhP756boddFxpA==`.

Vendored unmodified files: minified display/worker modules, built-in CMaps,
standard fonts and pure-JavaScript image-decoder fallbacks. Their upstream
licenses are retained. No PDF scripting sandbox, QuickJS, WASM, examples,
source maps, server code or external viewer is shipped. Repository attributes
preserve upstream bytes across Windows and Linux checkouts.

The public runtime manifest enumerates allowed files but is not served itself.
Only code/assets are public; PDFs are always fetched separately through the
existing authenticated, integrity-checked CRM API. No PDF contents are sent to
Mozilla, npm or another viewer service.

The renderer disables XFA, WASM and font-face loading; no scripting or annotation
actions are requested. The existing CSP is unchanged. Parsing is in a dedicated
worker; canvas rendering is bounded and stopped on preview close/access loss.

Update only through a reviewed, pinned official package, then refresh integrity
tests, licenses, manifest, exact static routes and cache revision. Never replace
these files through an unversioned CDN request.
