import { z } from 'zod'
import { transform, transformData } from './transform'

describe('transform', () => {
  test('maps to string path', async () => {
    const source = { foo: 'bar', a: { foo: { bar: 1 } } }
    const map = { a: 'foo', b: 'a.foo.bar' }

    const res = transform({ source, map })
    expect(res).toStrictEqual({ a: 'bar', b: 1 })
  })

  test('executes function', async () => {
    const source = { a: 45 }
    const map = { a: (source) => (source.a > 20 ? source.a : 'check') }

    const res = transform({ source, map })
    expect(res).toStrictEqual({ a: 45 })
  })

  test('handles undefined', async () => {
    const source = { a: { foo: undefined }, b: { a: { foo: { bar: 1 } } } }
    const map = { foo: 'a.foo', bar: 'b.d' }

    const res = transform({ source, map })
    expect(res).toStrictEqual({ foo: null, bar: null })
  })

  test('tries each string accessor', async () => {
    const source = { a: { b: { c: 'foo' } } }
    const map = { foo: ['d.e.f', 'a.b.c', 'c'] }

    const res = transform({ source, map })
    expect(res).toStrictEqual({ foo: 'foo' })
  })

  test('supply value', async () => {
    const source = {}
    const map = { a: () => 'foo' }

    const res = transform({ source, map })
    expect(res).toStrictEqual({ a: 'foo' })
  })

  test('supply null', async () => {
    const source = {}
    const map = { foo: null }

    const res = transform({ source, map })
    expect(res).toStrictEqual({ foo: null })
  })

  test('use formatted values option', async () => {
    const source = { a: 1, b: 'bar' }
    const map = { foo: (src) => src.a * 2, bar: ({}, { foo }) => foo * 2 }
    const optionsMap = { bar: { includeValues: ['foo'] } }

    const res = transform({ source, map, optionsMap })

    expect(res).toStrictEqual({ foo: 2, bar: 4 })
  })

  test('includeUnmapped', async () => {
    const source = { a: 1, b: 2, c: { foo: 'bar' } }
    const map = { c: 'c.foo' }

    const res = transform({ source, map, options: { includeUnmapped: true } })

    expect(res).toStrictEqual({ a: 1, b: 2, c: 'bar' })
  })

  test('accessor error resolves to null', async () => {
    const source = { a: 1, b: 2 }
    const map = {
      foo: () => {
        throw new Error('test error')
      },
    }

    const res = transform({ source, map })

    expect(res).toStrictEqual({ foo: null })
  })

  test('use accessor props', async () => {
    const source = { a: 1, b: 2 }
    const map = {
      foo: ({}, formattedVals, { prop }) => prop,
    }

    const res = transform({ source, map, accessorProps: { prop: 'test' } })

    expect(res).toStrictEqual({ foo: 'test' })
  })

  test('nested transform', () => {
    const data = [
      { a: 1, b: 2, c: { foo: 10, bar: 20 } },
      { a: 1, b: 2, c: { foo: 20, bar: 30 } },
    ]

    const map = {
      test: 'a',
      test2: 'b',
      test3: ({ c }) => transform({ source: c, map: { testFoo: 'foo', testBar: 'bar' } }),
    }

    const res = transformData({ data, map })
    const expected = [
      { test: 1, test2: 2, test3: { testFoo: 10, testBar: 20 } },
      { test: 1, test2: 2, test3: { testFoo: 20, testBar: 30 } },
    ]

    expect(res).toStrictEqual(expected)
  })

  test('options default value', () => {
    const source = { a: 1, b: 2 }
    const map = {
      foo: () => {
        throw new Error('test error')
      },
      bar: 'b',
    }

    const options = { defaultValue: [] }

    const res = transform({ source, map, options })

    expect(res).toStrictEqual({ foo: [], bar: 2 })
  })

  test('options map default value', () => {
    const source = { a: 1, b: 2 }
    const map = {
      foo: () => {
        throw new Error('test error')
      },
      bar: 'b',
    }

    const options = { defaultValue: [] }
    const optionsMap = { foo: { defaultValue: 'testDefault' } }

    const res = transform({ source, map, options, optionsMap })

    expect(res).toStrictEqual({ foo: 'testDefault', bar: 2 })
  })

  test('default value, null', () => {
    const source = { a: 1, b: null, c: null }
    const map = { foo: 'a', bar: ({ b }) => b, test: 'c' }
    const optionsMap = { bar: { defaultValue: 'test' }, test: { defaultValue: 'test2' } }

    const res = transform({ source, map, optionsMap })

    const expected = { foo: 1, bar: 'test', test: 'test2' }

    expect(res).toStrictEqual(expected)
  })

  test('default value, undefined', () => {
    const source = { a: 1, b: undefined }
    const map = { foo: 'a', bar: ({ b }) => b, test: 'c' }
    const optionsMap = { bar: { defaultValue: 'test' }, test: { defaultValue: 'test2' } }

    const res = transform({ source, map, optionsMap })

    const expected = { foo: 1, bar: 'test', test: 'test2' }

    expect(res).toStrictEqual(expected)
  })

  test('default value, false', () => {
    const source = { a: 1, b: false, c: false }
    const map = { foo: 'a', bar: ({ b }) => b, test: 'c' }
    const optionsMap = { bar: { defaultValue: 'test' }, test: { defaultValue: 'test2' } }

    const res = transform({ source, map, optionsMap })

    const expected = { foo: 1, bar: false, test: false }

    expect(res).toStrictEqual(expected)
  })

  test('default value only after all in array of accessors', () => {
    const source = { a: 1, b: { foo: 'bar' } }
    const map = { test: ['a.b', 'b.foo'] }
    const optionsMap = { test: { defaultValue: 'test' } }

    const res = transform({ source, map, optionsMap })

    const expected = { test: 'bar' }

    expect(res).toStrictEqual(expected)
  })

  test('schema error', () => {
    const source = { a: 'foo', b: { foo: 'bar' } }

    const map = { test: 'a', test2: 'b.foo' }

    const Schema = z.object({
      test: z.string(),
      test2: z.number(),
    })

    expect(() => transform({ source, map, options: { schema: Schema } })).toThrow()
  })

  test('schema success', () => {
    const source = { a: 'foo', b: { foo: 15 } }

    const map = { test: 'a', test2: 'b.foo' }

    const Schema = z.object({
      test: z.string(),
      test2: z.number(),
    })

    expect(() => transform({ source, map, options: { schema: Schema } })).not.toThrow()

    expect(transform({ source, map, options: { schema: Schema } })).toStrictEqual({
      test: 'foo',
      test2: 15,
    })
  })
})

test('parse error', () => {
  const source = { a: 1, b: 2 }

  const map = {
    foo: 'a',
    bar: 'b',
  }

  const parse = (res) => {
    if (res.foo === 1) {
      throw new Error()
    }

    return res
  }

  expect(() => transform({ source, map, options: { parse } })).toThrow()
})

test('parse success', () => {
  const source = { a: 1, b: 2 }

  const map = {
    foo: 'a',
    bar: 'b',
  }

  const parse = (res) => {
    if (res.foo === 100) {
      throw new Error()
    }

    return res
  }

  expect(() => transform({ source, map, options: { parse } })).not.toThrow()

  expect(transform({ source, map, options: { parse } })).toStrictEqual({ foo: 1, bar: 2 })
})

test('refine error', () => {
  const source = { a: 'foo', b: { foo: 15 } }

  const map = { test: 'a', test2: 'b.foo' }

  const Schema = z.object({
    test: z.string(),
    test2: z.number().refine((val) => val === 1),
  })

  expect(() => transform({ source, map, options: { schema: Schema } })).toThrow()
})

test('refine success', () => {
  const source = { a: 'foo', b: { foo: 15 } }

  const map = { test: 'a', test2: 'b.foo' }

  const Schema = z.object({
    test: z.string(),
    test2: z.number().refine((val) => val === 15),
  })

  expect(() => transform({ source, map, options: { schema: Schema } })).not.toThrow()

  expect(transform({ source, map, options: { schema: Schema } })).toStrictEqual({
    test: 'foo',
    test2: 15,
  })
})

describe('transformData', () => {
  test('transforms array of objects', async () => {
    const data = [
      { a: 1, b: 2 },
      { a: 2, b: 4 },
    ]
    const map = {
      foo: 'a',
      bar: 'b',
    }

    const res = transformData({ data, map })
    const expected = [
      { foo: 1, bar: 2 },
      { foo: 2, bar: 4 },
    ]

    expect(res).toStrictEqual(expected)
  })
})
