export default function minBy(collection, iteratee) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return undefined;
  }

  const getter =
    typeof iteratee === "function"
      ? iteratee
      : (item) => {
          if (iteratee == null) return item;
          return item?.[iteratee];
        };

  return collection.reduce((minItem, item) => (getter(item) < getter(minItem) ? item : minItem), collection[0]);
}
