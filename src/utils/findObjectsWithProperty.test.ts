import findObjectsWithProperty from './findObjectsWithProperty'

const nestedQBResponse = {
  Header: {},
  Rows: {
    Row: [
      {
        Header: {},
        Rows: {
          Row: [
            {
              Header: {},
              Rows: {
                Row: [
                  {
                    ColData: [{ id: '1', value: 'c0r0' }, { value: 'c1r0' }, { value: 'c2r0' }],
                    type: 'data',
                  },
                  {
                    ColData: [{ value: 'c0r1' }, { id: '55', value: 'c1r1' }, { value: 'c2r1' }],
                    type: 'data',
                  },
                  {
                    ColData: [{ value: 'c0r2' }, { id: '2', value: 'c1r2' }, { value: 'c2r2' }],
                    type: 'data',
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  Columns: {
    Column: [
      { ColType: 'sample', ColTitle: 'c0' },
      { ColType: 'sample', ColTitle: 'c1' },
      { ColType: 'sample', ColTitle: 'c2' },
    ],
  },
}

const testObj = { a: 1, b: 2 }

const testArr = [
  { a: 1, b: 2 },
  { c: 1, d: 2 },
]

const nestedObj = {
  obj: [
    {
      obj: [
        { a: 1, b: 2 },
        { c: 1, d: 2 },
      ],
    },
  ],
}

describe('properties', () => {
  describe('find object with given key in nested object structure', () => {
    describe('simplest case', () => {
      test('finds object with given key', () => {
        const result = findObjectsWithProperty({ object: testObj, key: 'a' })
        expect(result).toStrictEqual([{ a: 1, b: 2 }])
      })
    })

    describe('array of objects', () => {
      test('finds object with given key', () => {
        const result = findObjectsWithProperty({ object: testArr, key: 'a' })
        expect(result).toStrictEqual([{ a: 1, b: 2 }])
      })
    })
    describe('nested object', () => {
      test('finds object with given key', () => {
        const result = findObjectsWithProperty({ object: nestedObj, key: 'a' })
        expect(result).toStrictEqual([{ a: 1, b: 2 }])
      })
    })
    describe('sample QB response', () => {
      test('returns array of ColData objects', () => {
        const result = findObjectsWithProperty({ object: nestedQBResponse, key: 'ColData' })
        const expected = [
          {
            ColData: [{ id: '1', value: 'c0r0' }, { value: 'c1r0' }, { value: 'c2r0' }],
            type: 'data',
          },
          {
            ColData: [{ value: 'c0r1' }, { id: '55', value: 'c1r1' }, { value: 'c2r1' }],
            type: 'data',
          },
          {
            ColData: [{ value: 'c0r2' }, { id: '2', value: 'c1r2' }, { value: 'c2r2' }],
            type: 'data',
          },
        ]

        expect(result).toStrictEqual(expected)
      })
    })

    describe('key and value', () => {
      test('value present', () => {
        const result = findObjectsWithProperty({ object: nestedObj, key: 'a', value: 1 })

        expect(result).toStrictEqual([{ a: 1, b: 2 }])
      })

      test('value missing', () => {
        const result = findObjectsWithProperty({ object: nestedObj, key: 'a', value: 2 })

        expect(result).toStrictEqual([])
      })
    })
  })
})
