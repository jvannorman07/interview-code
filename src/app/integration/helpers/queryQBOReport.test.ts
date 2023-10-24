import { DateTime } from 'luxon'
import queryQBOReport from './queryQBOReport'
import { createAppContext } from '../../../test/utils'

const testData = {
  Header: {},
  Columns: { Column: [{ ColTitle: 'Date' }] },
  Rows: {
    Row: [
      { ColData: [{ value: '2021-01-01' }], type: 'Data' },
      { ColData: [{ value: '2021-01-15' }], type: 'Data' },
      { ColData: [{ value: '2021-01-20' }], type: 'Data' },
      { ColData: [{ value: '2021-01-31' }], type: 'Data' },
    ],
  },
}

const testClient = {
  //eslint-disable-next-line
  async report(type, params) {
    const { start_date, end_date } = params
    const startDt = DateTime.fromISO(start_date)
    const endDt = DateTime.fromISO(end_date)

    const rows = testData.Rows.Row

    const filtered = rows.filter((row) => {
      const dt = DateTime.fromISO(row.ColData[0].value)

      return dt >= startDt && dt <= endDt
    })

    //hacky way to return the qbo error string if there are greater than a certain number
    //of rows
    if (filtered.length > 2) {
      return {
        ...testData,
        Rows: {
          Row: [
            {
              ColData: [{ value: 'Unable to display more data. Please reduce the date range.' }],
              type: 'Data',
            },
            ...filtered,
          ],
        },
      }
    }

    return { ...testData, Rows: { Row: filtered } }
  },
}

describe('queryQBOReport', () => {
  let ctx

  beforeEach(() => {
    ctx = createAppContext()
  })

  test('returns data', async () => {
    const res = await queryQBOReport(
      {
        client: testClient,
        type: 'GeneralLedger',
        reportPeriod: { startDate: '2021-01-01', endDate: '2021-02-01' },
        params: {},
      },
      ctx,
    )

    const expected = {
      generalLedgerTable: [
        { Date: '2021-01-01' },
        { Date: '2021-01-15' },
        { Date: '2021-01-20' },
        { Date: '2021-01-31' },
      ],
      generalLedgerResponses: [
        {
          ...testData,
          Rows: {
            Row: [
              { ColData: [{ value: '2021-01-01' }], type: 'Data' },
              { ColData: [{ value: '2021-01-15' }], type: 'Data' },
            ],
          },
        },
        {
          ...testData,
          Rows: {
            Row: [
              { ColData: [{ value: '2021-01-20' }], type: 'Data' },
              { ColData: [{ value: '2021-01-31' }], type: 'Data' },
            ],
          },
        },
      ],
    }

    expect(res).toStrictEqual(expected)
  })
})
