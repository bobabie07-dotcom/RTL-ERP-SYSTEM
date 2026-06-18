export const BATCHES = [];

export function getBatch(id) {
  return BATCHES.find((b) => b.id === id) || null;
}
