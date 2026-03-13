export default function omit(object, keys) {
  if (object == null || typeof object !== "object") {
    return {};
  }

  const blocked = new Set(Array.isArray(keys) ? keys : [keys]);
  return Object.fromEntries(Object.entries(object).filter(([key]) => !blocked.has(key)));
}
