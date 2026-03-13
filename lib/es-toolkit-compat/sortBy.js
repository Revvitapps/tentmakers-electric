export default function sortBy(collection, iteratee) {
  if (!Array.isArray(collection)) {
    return [];
  }

  const list = [...collection];

  const getter =
    typeof iteratee === "function"
      ? iteratee
      : (item) => {
          if (item == null || iteratee == null) return item;
          return item[iteratee];
        };

  list.sort((a, b) => {
    const aValue = getter(a);
    const bValue = getter(b);

    if (aValue === bValue) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (aValue > bValue) return 1;
    if (aValue < bValue) return -1;
    return 0;
  });

  return list;
}
