import { NextResponse } from "next/server";

interface ShopifyProduct {
  id: number;
  title: string;
  description: string;
  images: Array<{ src: string }>;
  skus: string[]; // Extracted from variants
}

interface ShopifyAPIResponse {
  products: Array<{
    id: number;
    title: string;
    body_html: string; // Shopify product description field
    images: Array<{ src: string }>;
    variants: Array<{ sku: string }>;
  }>;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q: string = searchParams.get("q")?.toLowerCase() || "";

    const SHOPIFY_STORE: string = process.env.SHOPIFY_STORE!;
    const SHOPIFY_PRODUCT_TOKEN: string = process.env.SHOPIFY_PRODUCT_TOKEN!;

    let allProducts: ShopifyProduct[] = [];
    let nextPageInfo: string | null = null;

    const limit: number = 250;

    do {
      const url: string = nextPageInfo
        ? `https://${SHOPIFY_STORE}/admin/api/2024-07/products.json?limit=${limit}&page_info=${nextPageInfo}`
        : `https://${SHOPIFY_STORE}/admin/api/2024-07/products.json?limit=${limit}`;

      const response: Response = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_PRODUCT_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Shopify error:", await response.text());
        return NextResponse.json(
          { error: "Shopify error" },
          { status: response.status }
        );
      }

      const linkHeader: string | null = response.headers.get("link");

      const data: ShopifyAPIResponse = await response.json();

      const mapped: ShopifyProduct[] = data.products.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.body_html, // map description here
        images: p.images,
        skus: p.variants.map((v) => v.sku).filter(Boolean), // Filter out empty SKUs
      }));

      allProducts = [...allProducts, ...mapped];

      // Handle pagination
      const match: RegExpMatchArray | null = linkHeader?.match(
        /<[^>]+page_info=([^>]+)>; rel="next"/
      ) || null;

      nextPageInfo = match ? match[1] : null;
    } while (nextPageInfo);

    // Apply search filter to include title, description, and SKU matching
    const filtered: ShopifyProduct[] = q
      ? allProducts.filter((p) => {
          const titleMatch = p.title.toLowerCase().includes(q);
          const skuMatch = p.skus.some((sku) => sku.toLowerCase().includes(q));
          const descriptionMatch = p.description.toLowerCase().includes(q);
          return titleMatch || skuMatch || descriptionMatch;
        })
      : allProducts;

    return NextResponse.json({ products: filtered });
  } catch (error) {
    const err = error as Error;
    console.error("Shopify fetch error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
