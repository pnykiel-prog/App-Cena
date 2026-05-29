export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export function actionError(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult {
  return { success: false, error, fieldErrors };
}

export function actionOk<T>(data?: T): ActionResult<T> {
  return { success: true, data };
}
