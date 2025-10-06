export async function decrementInventory(
  lines: Array<{ productId: string; qty: number }>
) {
  const base = process.env.CATALOG_BASE_URL!;
  const key = process.env.CATALOG_API_KEY!;
  const res = await fetch(`${base}/api/public/inventory/decrement`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ lines }),
  });

  if (!res.ok) {
    let details: unknown = undefined;
    try {
      details = await res.json();
    } catch {
      // keep details undefined on non-JSON responses
    }
    const error = Object.assign(new Error("CatalogDecrementFailed"), {
      status: res.status,
      details,
    });
    throw error;
  }

  return (await res.json()) as {
    ok: true;
    results: Array<{ productId: string; stockQty: number }>;
  };
}
