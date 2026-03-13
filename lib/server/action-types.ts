export type ActionResult<T = undefined> = {
  ok: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[]>;
};

export function success<T = undefined>(message: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function failure<T = undefined>(message: string, fieldErrors?: Record<string, string[]>): ActionResult<T> {
  return { ok: false, message, fieldErrors };
}
