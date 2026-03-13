export default function maxBy(collection, iteratee) {
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

  return collection.reduce((maxItem, item) => (getter(item) > getter(maxItem) ? item : maxItem), collection[0]);
}
