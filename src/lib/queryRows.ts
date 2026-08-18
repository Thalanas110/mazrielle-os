export function queryRows<T>(result: { rows: T[] }): T[] {
  return result.rows;
}
