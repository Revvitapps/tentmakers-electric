export default function uniqBy(collection, iteratee) {
  if (!Array.isArray(collection)) {
    return [];
  }

  const getKey =
    typeof iteratee === "function"
      ? iteratee
      : (item) => {
          if (iteratee == null) return item;
          return item?.[iteratee];
        };

  const seen = new Set();
  const result = [];

  for (const item of collection) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
