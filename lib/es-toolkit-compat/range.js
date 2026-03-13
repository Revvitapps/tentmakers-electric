export default function range(start, end, step = 1) {
  let from = start;
  let to = end;

  if (to === undefined) {
    from = 0;
    to = start;
  }

  if (step === 0) return [];

  const result = [];
  const increment = step > 0 ? step : -Math.abs(step);

  if (increment > 0) {
    for (let i = from; i < (to ?? 0); i += increment) {
      result.push(i);
    }
  } else {
    for (let i = from; i > (to ?? 0); i += increment) {
      result.push(i);
    }
  }

  return result;
}
