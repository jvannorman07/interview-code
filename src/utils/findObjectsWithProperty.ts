import { isNil } from 'lodash'

type Props = {
  object: any
  key: string
  value?: any
}

export default function findObjectsWithProperty(props: Props): any[] {
  const { object, key, value } = props

  let result: any[] = []

  if (Array.isArray(object)) {
    object.forEach((childObject) => {
      result = result.concat(findObjectsWithProperty({ object: childObject, key, value }))
    })
  } else if (object.hasOwnProperty(key) && (isNil(value) || object[key] === value)) {
    result.push(object)
  } else {
    for (let prop in object) {
      if (typeof object[prop] !== 'string' && typeof object[prop] !== 'number') {
        result = result.concat(findObjectsWithProperty({ object: object[prop], key, value }))
      }
    }
  }

  return result
}
