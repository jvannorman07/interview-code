import { uniqWith, isEqual, pick } from 'lodash'

export function deduplicateArray(
  array: Record<string, any>[],
  uniqueKeys: string[],
): Record<string, any>[] {
  return uniqWith(array, (a, b) => isEqual(pick(a, uniqueKeys), pick(b, uniqueKeys)))
}
