# Browser Tools Fallback (Chromium SIGSEGV)

## Context
In this container/tooling environment, `mcp__browser_tools__run_playwright_script` can fail when launching Chromium with a SIGSEGV in `chrome-headless-shell`.

This is an infra/runtime issue of the browser binary, not a Next.js app code failure.

## Recommended workaround
Use Firefox for screenshot/visual validation scripts in MCP Browser Tools when Chromium crashes.

### MCP script template (Firefox)
```python
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.firefox.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 1100})
        await page.goto('http://127.0.0.1:3200/es/home-composer', wait_until='domcontentloaded', timeout=120000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path='artifacts/home-composer.png', full_page=True)
        await browser.close()

asyncio.run(main())
```

## Validation sequence
1. Start app (`npm run dev -- --hostname 0.0.0.0 --port 3200`).
2. Warm the route (`curl -I http://127.0.0.1:3200/es/home-composer`).
3. Run MCP screenshot script with Firefox.

## Notes
- Keep Chromium as first option if the environment is healthy.
- If Chromium fails with SIGSEGV, switch to Firefox and continue QA to avoid blocking delivery.
