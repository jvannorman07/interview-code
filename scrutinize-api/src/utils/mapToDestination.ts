import { get, isFunction, cloneDeep, has, set, unset, remove } from 'lodash'

/**
 * @param {object} source – the source object with the values we intend to map
 * @param {object} destination – optional destination object. If supplied, the function will search the destination
 * object for the location determined by the map. If not supplied, options.shouldSet should be used to populate the blank destination object.
 * @param {Map} map – the map keys are the keys of the source object. The values are accessors: options to locate a destination in the
 * destination object. See Accessor Types below.
 * @param {object} parentObj – used for recursion, especially when mapping arrays. Object that the current source object belongs to.
 * Can be used in accessor function.
 * @param {object} options – global shouldSet property sets the path provided in the map. Cannot be used in combination with an accessor
 * that is an array of paths because it is not checking if the destination path is present. Used primarily for populating blank object.
 *
 * Accessor Types:
 * string – path in the destination object (using dot notation)
 *
 * array of strings – checks each path and updates if the path is found.
 *
 * basic accessor options - { path, shouldSet, nullable, deleteDestinationPaths }
 *      @param {string} path – string accessor
 *      @param {boolean} shouldSet – whether the property should be set on the destination object in the given path
 *      @param {boolean} nullable – determines source value is allowed to be null. If false/undefined, null values won't be
 *                  updated in the destination
 *      @param {string[]} deleteDestinationPaths – removes other properties from the destination object
 *
 * array accessor options – { arrayAccessor, arrayMatcher, arrayMap, shouldSet, shouldDelete }
 *      @param {string} arrayAccessor – where to locate destination array
 *      @param {string[]} arrayMatcher – keys to use to match object in source array to object in destination array.
 *                                        first string is source key, second is destination key.
 *      @param {Map} arrayMap – maps source object in array to destination object in array
 *      @param {boolean} shouldSet – in this case, shouldSet pushes a new object onto the destination array using the map.
 *                                   If this accessor.shouldSet is true, arrayMap should not have any accessors that is an array of paths
 *                                   because each array object calls mapToDestination with options.shouldSet = true.
 *      @param {boolean} shouldDelete – uses the arrayMatcher to delete an object from the destination array.
 *
 */

// return true if object was updated
export function deepUpdateValue(
  obj: Record<string, any>,
  path: string,
  value: any,
  shouldSet?: boolean,
): boolean {
  // optionally create path
  if (has(obj, path) || shouldSet) {
    set(obj, path, value)
    return true
  }

  return false
}

type MapAccessorOptions = {
  path?: string
  shouldSet?: boolean
  shouldDelete?: boolean
  nullable?: boolean
  deleteDestinationPaths?: string[]
  arrayAccessor?: string
  arrayMatcher?: string[]
  arrayMap?: Map
}

type BaseAccessor = string | MapAccessorOptions

type MapAccessorFunction = (source: any, parentObj?: any) => BaseAccessor | null

type MapAccessor = BaseAccessor | BaseAccessor[] | MapAccessorFunction
type Map = Record<string, MapAccessor>

type MapToDestinationProps = {
  source: Record<string, any>
  destination?: Record<string, any>
  map: Map
  parentObj?: any
  options?: {
    shouldSet?: boolean
  }
}

type MapValueProps = {
  source: Record<string, any>
  sourceKey: string
  destination: Record<string, any>
  accessor: BaseAccessor
  shouldSet?: boolean
}

function mapValue(props: MapValueProps): boolean {
  const { source, sourceKey, destination, accessor } = props

  const nullable = typeof accessor !== 'string' && accessor.nullable

  // don't update if the key is not present in the source object
  if (!has(source, sourceKey)) {
    return false
  }

  // don't update if source value is null/undefined unless explicitly nullable
  if (!get(source, sourceKey) && !nullable) {
    return false
  }

  if (typeof accessor === 'string') {
    return deepUpdateValue(destination, accessor, source[sourceKey], props.shouldSet)
  }

  if (accessor.path) {
    const { path, deleteDestinationPaths } = accessor

    // global shouldSet override, useful when you need to populate an entire object from scratch
    const shouldSet = accessor.shouldSet || props.shouldSet

    if (deleteDestinationPaths) {
      deleteDestinationPaths.forEach((path) => unset(destination, path))
    }

    return deepUpdateValue(destination, path, source[sourceKey], shouldSet)
  }

  return false
}

export function mapToDestination(props: MapToDestinationProps): Record<string, any> {
  const { source, destination = {}, map, parentObj, options } = props

  const result = cloneDeep(destination)

  Object.entries(map).forEach(([sourceKey, accessor]) => {
    // array of strings or accessor objects
    if (Array.isArray(accessor)) {
      // don't allow array accessor if there is no destination (populating a blank object)
      if (!props.destination) {
        return
      }

      let res = false

      accessor.every((accessorObj) => {
        res = mapValue({ source, sourceKey, destination: result, accessor: accessorObj })

        // break loop if successfully updated
        return !res
      })

      // true if value was updated
      return res
    }

    // function to return accessor based on source
    if (isFunction(accessor)) {
      // don't update if accessor function error
      try {
        // parent object for nested mapping (e.g. array of transaction lines)
        const accessorFromFn = accessor(source, parentObj)

        if (accessorFromFn) {
          return mapValue({
            source,
            sourceKey,
            destination: result,
            accessor: accessorFromFn,
            shouldSet: options?.shouldSet,
          })
        }
      } catch {
        return
      }

      return
    }

    if (typeof accessor === 'string' || accessor.path) {
      return mapValue({
        source,
        sourceKey,
        destination: result,
        accessor,
        shouldSet: options?.shouldSet,
      })
    }

    const { arrayAccessor, arrayMatcher, arrayMap } = accessor

    const sourceArray = source[sourceKey]

    if (!sourceArray || !arrayAccessor) {
      return
    }

    // location of array in destination object
    let destinationArray = get(result, arrayAccessor)

    if (!destinationArray) {
      // use global shouldSet prop to determine if a new key for the array should be added to the main
      // destination object
      if (options?.shouldSet) {
        set(result, arrayAccessor!, [])
        destinationArray = get(result, arrayAccessor)
      } else {
        return
      }
    }

    sourceArray.forEach((sourceObj: any) => {
      // function for finding destination object in the destination array
      const destObjFn = (destObj: any) => {
        if (!arrayMatcher) {
          return false
        }

        return sourceObj[arrayMatcher![0]] === destObj[arrayMatcher![1]]
      }

      // delete objects from array using arrayMatcher
      if (accessor.shouldDelete) {
        remove(destinationArray, destObjFn)

        return
      }

      // if !shouldDelete, arrayMap is required
      if (!arrayMap) {
        return
      }

      // if shouldSet prop on the accessor is set to true, push new objects to the array
      if (accessor.shouldSet) {
        const newObj = mapToDestination({
          source: sourceObj,
          map: arrayMap,
          parentObj: source,
          options: { shouldSet: true },
        })

        destinationArray.push(newObj)

        return
      }

      // remainder requires finding the destination object in the array
      const destinationObj = destinationArray.find(destObjFn)

      if (!destinationObj) {
        return
      }

      const destArrayIdx = destinationArray.indexOf(destinationObj)

      const resultObj = mapToDestination({
        source: sourceObj,
        destination: destinationObj,
        map: arrayMap,
        parentObj: source,
      })

      destinationArray[destArrayIdx] = resultObj
    })
  })

  return result
}
