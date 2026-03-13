export default function throttle(fn, wait = 0) {
  let lastCall = 0;
  let timeoutId = null;
  let latestArgs;

  const invoke = () => {
    lastCall = Date.now();
    timeoutId = null;
    fn(...latestArgs);
  };

  function throttled(...args) {
    latestArgs = args;
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      invoke();
      return;
    }

    if (!timeoutId) {
      timeoutId = setTimeout(invoke, remaining);
    }
  }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}
