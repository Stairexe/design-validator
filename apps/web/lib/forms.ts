/** String value of a form field (file inputs and missing fields yield ''). */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

/** File value of a form field, or null. */
export function formFile(form: FormData, name: string): File | null {
  const value = form.get(name);
  return value instanceof File ? value : null;
}
