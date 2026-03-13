export default function sumBy(collection, iteratee) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return 0;
  }

  const getter =
    typeof iteratee === "function"
      ? iteratee
      : (item) => {
          if (iteratee == null) return item;
          return item?.[iteratee];
        };

  return collection.reduce((total, item) => total + Number(getter(item) ?? 0), 0);
}
