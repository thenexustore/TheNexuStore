import { expect, Page, test, TestInfo } from "@playwright/test";

const productSlug = "mock-mobile-product";

const mockProductsResponse = {
  products: [
    {
      id: "prod-1",
      title: "Mock Mobile Product With A Long Name For Wrapping",
      slug: productSlug,
      brand_name: "Nexu Brand",
      brand_slug: "nexu-brand",
      category_name: "Phones",
      category_slug: "phones",
      sku_code: "SKU-MOCK-001",
      sku_id: "sku-1",
      price: 149.99,
      compare_at_price: 199.99,
      discount_percentage: 25,
      stock_quantity: 10,
      stock_status: "IN_STOCK",
      short_description: "Compact flagship mock device.",
      thumbnail: "/No_Image_Available.png",
      rating_avg: 4.7,
      rating_count: 48,
      is_featured: true,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  total_pages: 1,
  filters: {
    categories: [{ id: "cat-1", name: "Phones", slug: "phones", count: 1 }],
    brands: [{ id: "brand-1", name: "Nexu Brand", slug: "nexu-brand", count: 1 }],
    price_range: { min: 149, max: 199 },
    attributes: [],
  },
};

const mockProductDetail = {
  ...mockProductsResponse.products[0],
  description_html:
    "<p>Mock description intended to validate mobile wrapping and CTA placement.</p>",
  images: [{ url: "/No_Image_Available.png", type: "image", sort_order: 0 }],
  attributes: [{ key: "memory", name: "Memory", data_type: "text", values: ["128GB"] }],
  variants: [
    {
      id: "variant-1",
      sku_id: "sku-1",
      sku_code: "SKU-MOCK-001",
      variant_name: "Default",
      attributes: [{ key: "color", value: "Blue" }],
      price: 149.99,
      compare_at_price: 199.99,
      stock_quantity: 10,
      stock_status: "IN_STOCK",
      images: [{ url: "/No_Image_Available.png", type: "image", sort_order: 0 }],
    },
  ],
  brand: { id: "brand-1", name: "Nexu Brand", slug: "nexu-brand" },
  categories: [{ id: "cat-1", name: "Phones", slug: "phones" }],
  main_category: { id: "cat-1", name: "Phones", slug: "phones" },
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockCart = {
  id: "legacy-cart",
  items: [
    {
      id: "legacy-1",
      sku_id: "sku-1",
      product_title: "Mock Mobile Product With A Long Name For Wrapping",
      sku_code: "SKU-MOCK-001",
      price: 149.99,
      quantity: 1,
      line_total: 149.99,
      thumbnail: "/No_Image_Available.png",
      max_quantity: 99,
      in_stock: true,
      product_id: "prod-1",
    },
  ],
  summary: {
    subtotal: 149.99,
    shipping: 0,
    tax: 31.5,
    customs_duty: 0,
    total: 181.49,
    item_count: 1,
    currency: "EUR",
    checkout_available: true,
    meta: {
      status: "OK",
      zone_code: "ES",
      tax_label: "IVA",
      tax_mode: "VAT",
      tax_rate: 0.21,
      customs_duty_rate: 0,
      customs_duty_amount: 0,
      message: "Mock shipping available",
    },
  },
};

const mockLegacyCartStorage = JSON.stringify([
  {
    id: "prod-1",
    sku_id: "sku-1",
    sku_code: "SKU-MOCK-001",
    name: "Mock Mobile Product With A Long Name For Wrapping",
    price: 149.99,
    quantity: 1,
    image: "/No_Image_Available.png",
    slug: productSlug,
    brand: "Nexu Brand",
    stock_status: "IN_STOCK",
  },
]);

async function assertNoHorizontalOverflow(page: Page) {
  const { maxScroll, viewport } = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      maxScroll: Math.max(document.body.scrollWidth, doc.scrollWidth),
      viewport: window.innerWidth,
    };
  });

  expect(maxScroll).toBeLessThanOrEqual(viewport + 1);
}

async function captureStep(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((legacyCart) => {
    window.localStorage.setItem("cart", legacyCart);
  }, mockLegacyCartStorage);

  await page.route("**://localhost:4000/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname === "/admin/banners/active") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "banner-1",
              image: "/No_Image_Available.png",
              overlay: "rgba(0,0,0,0.25)",
              align: "left",
              title_text: "Mock Mobile Banner",
              title_color: "#ffffff",
              title_size: "xl",
              title_weight: "700",
              title_font: "sans",
              subtitle_text: "Smoke test banner",
              subtitle_color: "#ffffff",
              subtitle_size: "md",
              button_text: "Shop now",
              button_link: "/products",
              button_bg: "#ffffff",
              button_color: "#111827",
              button_radius: "8px",
              button_padding: "12px 20px",
              is_active: true,
              sort_order: 1,
            },
          ],
        }),
      });
    }

    if (parsedUrl.pathname === "/featured-products") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "featured-1",
              image_url: "/No_Image_Available.png",
              product: {
                id: "prod-1",
                title: "Mock Mobile Product With A Long Name For Wrapping",
                slug: productSlug,
                brand: { name: "Nexu Brand", slug: "nexu-brand" },
                skus: [
                  {
                    prices: [
                      {
                        sale_price: "149.99",
                        compare_at_price: "199.99",
                      },
                    ],
                  },
                ],
                media: [{ url: "/No_Image_Available.png" }],
              },
            },
          ],
        }),
      });
    }

    if (parsedUrl.pathname === "/user/products/deals") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProductsResponse.products),
      });
    }

    if (parsedUrl.pathname === `/user/products/slug/${productSlug}`) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProductDetail),
      });
    }

    if (/^\/user\/products\/[^/]+\/related$/.test(parsedUrl.pathname)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockProductsResponse.products[0]]),
      });
    }

    if (parsedUrl.pathname === "/user/products") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProductsResponse),
      });
    }

    if (
      parsedUrl.pathname.startsWith("/cart") ||
      parsedUrl.pathname === "/checkout/create-order"
    ) {
      if (method === "POST" && parsedUrl.pathname === "/checkout/create-order") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ order: { id: "order-1", tracking_token: "track-1" } }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCart),
      });
    }

    if (parsedUrl.pathname.includes("/auth/me")) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Not authenticated" }),
      });
    }

    return route.continue();
  });
});

test("mobile smoke flow keeps layout stable and key CTAs visible", async ({ page }, testInfo) => {
  await page.goto("/es/store");
  await assertNoHorizontalOverflow(page);
  await captureStep(page, testInfo, "store-home");

  await page.goto("/es/products");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await assertNoHorizontalOverflow(page);

  const productHref = await page
    .locator('a[href*="/products/"]')
    .filter({ hasNotText: /^Products$/i })
    .first()
    .getAttribute("href");

  const targetProductPath = productHref?.startsWith("/")
    ? productHref
    : `/es/products/${productSlug}`;

  await page.goto(targetProductPath);
  await expect(page).toHaveURL(/\/es\/products\//);
  await expect(
    page.getByRole("button", { name: /add to cart|añadir/i }).first(),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await captureStep(page, testInfo, "store-pdp");

  await page.goto("/es/cart");
  await expect(
    page.getByRole("button", { name: /ir a pagar|checkout|proceed/i }).first(),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.goto("/es/checkout");
  await expect(
    page.getByRole("button", { name: /realizar pedido|place order|order/i }).first(),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await captureStep(page, testInfo, "store-checkout");
});
