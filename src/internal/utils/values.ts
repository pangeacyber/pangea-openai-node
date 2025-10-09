export let isArray = (val: unknown): val is unknown[] =>
  (
    // biome-ignore lint/suspicious/noAssignInExpressions: matches upstream.
    // biome-ignore lint/complexity/noCommaOperator: matches upstream.
    (isArray = Array.isArray), isArray(val)
  );
export const isReadonlyArray = isArray as (
  val: unknown
) => val is readonly unknown[];

export function isObj(obj: unknown): obj is Record<string, unknown> {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}
