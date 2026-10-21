// Runs `count` independent requests concurrently for providers that return one image per call.
// Images that succeed are kept even when others fail; the caller decides how to report the errors.
export async function runBatch(count, request) {
  const results = await Promise.allSettled(Array.from({ length: count }, () => request()));
  const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
  if (fulfilled.length === 0) throw errors[0];
  return {
    buffers: fulfilled.map((r) => r.buffer),
    cost: sumCosts(fulfilled.map((r) => r.cost)),
    errors,
  };
}

// Adds up per-image costs. Returns null when no image reported one.
export function sumCosts(costs) {
  const known = costs.filter(Boolean);
  if (known.length === 0) return null;
  return {
    usd: known.reduce((total, c) => total + c.usd, 0),
    estimated: known.some((c) => c.estimated),
  };
}
