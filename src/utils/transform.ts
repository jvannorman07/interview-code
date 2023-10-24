import { mapValues, isNil, get, isFunction, pick } from 'lodash'
import { z } from 'zod'

/**
 * Transforms the source object based on the provided map and options.
 *
 * @param {Record<string, any>} props.source - The source object to transform.
 * @param {Record<string, Accessor>} props.map - The map to use for the transformation. The keys
 * become the keys of the transformed result, and the values (Accessor type) tell the transformer how to find
 * the value in the source object. The accessor can be a string indicating the location of the value in the source obect
 * (e.g. 'a.foo.bar'), an array of string accessors that the transformer attepts in order (e.g. ['a.foo.bar', 'b.bar.foo']),
 * or a function that takes the source object as an argument.
 * @param {OptionsMap} [props.optionsMap] - A map of options for keys in the map. This allows passing a default
 * value for a specific field (e.g. { foo: { defaultValue: 0 } }) and passing a list of included values that have already been
 * formatted (taking the formatted values for other fields and passing those formatted values into the accessor function)
 * @param {Options} [props.options] - The global options for the transformation. Possible options are:
 * includeUnmapped – return all unformatted values in the source object along with the formatted values.
 * defaultValue – a global default value (defaults to null if not specified)
 * schema – a zod schema to validate the result against
 * parse – a manual parsing function for validation
 * @param {Record<string, any>} [props.accessorProps] - External properties available to the accessor functions, useful
 * for passing in additional information to the transformer.
 * @returns {Result} The transformed object with a generic type.
 */

export type Accessor = string | string[] | Function | null
type AccessorOptions = { includeValues?: string[]; defaultValue?: any }

type OptionsMap = Record<string, AccessorOptions>

type ParserFunction = <Result extends Record<string, any>>(input: Result) => Result

type Options = {
  includeUnmapped?: boolean
  defaultValue?: any
  schema?: z.ZodType
  parse?: ParserFunction
}

type TransformProps = {
  source: Record<string, any>
  map: Record<string, Accessor>
  optionsMap?: OptionsMap
  options?: Options
  accessorProps?: Record<string, any>
}

export function transform<Result extends Record<string, any>>(props: TransformProps): Result {
  // accessor props are values available to the accessor functions
  const { source, map, optionsMap, options, accessorProps } = props

  const transformed = mapValues(map, (accessor, key) => {
    const keyOptions = optionsMap?.[key]
    const defaultValue = keyOptions?.defaultValue ?? options?.defaultValue ?? null

    try {
      if (isNil(accessor)) {
        // passing null as the accessor should always return null, regardless of default value
        return null
      }

      if (isFunction(accessor)) {
        // allow passing in formatted values to the transform function (by calling the transform function
        // on a subset of the map)
        if (keyOptions?.includeValues) {
          const formattedValues = transform({ source, map: pick(map, keyOptions.includeValues) })

          return accessor(source, formattedValues, accessorProps) ?? defaultValue
        }

        return accessor(source, {}, accessorProps) ?? defaultValue
      }

      if (typeof accessor === 'string') {
        // get defaultValue allows null
        return get(source, accessor) ?? defaultValue
      }

      if (accessor.length) {
        for (const transformString of accessor as string[]) {
          const result = get(source, transformString)

          if (!isNil(result)) {
            return result
          }
        }
      }

      return defaultValue
    } catch (err: any) {
      // an error in the accessor results in a null value instead of a thrown error
      return defaultValue
    }
  })

  let result: any = {} as Result

  // return rest of source object
  if (options?.includeUnmapped) {
    result = { ...source, ...transformed } as Result
  } else {
    result = transformed as Result
  }

  if (options?.schema) {
    return options.schema.parse(result)
  }

  if (options?.parse) {
    return options.parse(result)
  }

  return result
}

type TransformDataProps = {
  data: Record<string, any>[]
  map: Record<string, Accessor>
  optionsMap?: Record<string, AccessorOptions>
  options?: Options
  accessorProps?: Record<string, any>
}

export function transformData<Result extends Record<string, any>>(
  props: TransformDataProps,
): Result[] {
  const { data, map, optionsMap, options, accessorProps } = props

  return data.map((source) =>
    transform<Result>({ source, map, optionsMap, options, accessorProps }),
  )
}
