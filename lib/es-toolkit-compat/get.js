export default function get(object, path, defaultValue) {
  if (!path) {
    return object === undefined ? defaultValue : object;
  }

  const keys = Array.isArray(path)
    ? path
    : String(path)
        .replace(/\[(\w+)\]/g, ".$1")
        .replace(/^\./, "")
        .split(".");

  let current = object;

  for (const key of keys) {
    if (current == null) {
      return defaultValue;
    }

    current = current[key];
  }

  return current === undefined ? defaultValue : current;
}
