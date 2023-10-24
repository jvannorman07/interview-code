import getTableFromQBResponse from './getTableFromQBResponse'

const simpleQBResponse = {
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
  Columns: {
    Column: [
      { ColType: 'sample', ColTitle: 'c0' },
      { ColType: 'sample', ColTitle: 'c1' },
      { ColType: 'sample', ColTitle: 'c2' },
    ],
  },
}

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

const table = [
  { c0: 'c0r0', c1: 'c1r0', c2: 'c2r0' },
  { c0: 'c0r1', c1: 'c1r1', c2: 'c2r1' },
  { c0: 'c0r2', c1: 'c1r2', c2: 'c2r2' },
]

const responseWithIds = {
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
        ColData: [{ value: 'c0r2' }, { id: '2', value: 'c1r2' }, { id: '3', value: 'c2r2' }],
        type: 'data',
      },
    ],
  },
  Columns: {
    Column: [
      { ColType: 'sample', ColTitle: 'c0' },
      { ColType: 'sample', ColTitle: 'Transaction Type' },
      { ColType: 'sample', ColTitle: 'Account' },
    ],
  },
}

const tableWithIds = [
  { c0: 'c0r0', 'Transaction Type': 'c1r0', Account: 'c2r0' },
  { c0: 'c0r1', 'Transaction Type': 'c1r1', Account: 'c2r1', transactionId: '55' },
  { c0: 'c0r2', 'Transaction Type': 'c1r2', Account: 'c2r2', transactionId: '2', accountId: '3' },
]

describe('getTableFromQBResponse', () => {
  describe('simple table', () => {
    test('creates correct sample table', () => {
      expect(getTableFromQBResponse(simpleQBResponse)).toStrictEqual(table)
    })
  })

  describe('nested table', () => {
    test('creates correct sample table', () => {
      expect(getTableFromQBResponse(nestedQBResponse)).toStrictEqual(table)
    })
  })

  describe('transaction and account ids', () => {
    test('returns ids when present', () => {
      expect(getTableFromQBResponse(responseWithIds)).toStrictEqual(tableWithIds)
    })
  })
})
