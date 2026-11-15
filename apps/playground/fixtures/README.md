# Fixtures

The unstyled pages Playwright drives: `fixtures/<name>/index.html`, each its own page of the
playground's Vite app (`vite.config.ts` builds every folder here), titled by its `<title>` and
linked from the sidebar. A fixture carries only the few lines of CSS a test needs (hit areas, room
around the droppables), so the specs exercise the packages and nothing else. The same spec runs
against an LTR and an RTL fixture, in Chromium and Firefox (`playwright.config.ts`).
