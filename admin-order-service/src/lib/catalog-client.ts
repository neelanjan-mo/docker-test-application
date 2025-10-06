type PublicProduct = {
  _id: string;
  name: string;
  price: number;
  currency: string;
  stockQty: number;
  status: "active" | "inactive";
  version?: number;
};

export async function lookupProducts(ids: string[]): Promise<PublicProduct[]> {
  const base = process.env.CATALOG_BASE_URL;
  const key = process.env.CATALOG_API_KEY;
  if (!base || !key || ids.length === 0) return [];
  const res = await fetch(`${base}/api/public/products/lookup`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`Catalog lookup failed: ${res.statusText}`);
  return res.json();
}
