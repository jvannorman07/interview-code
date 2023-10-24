import { camelCase, upperFirst } from 'lodash'

export function pascalCase(value: string): string {
  return upperFirst(camelCase(value))
}
