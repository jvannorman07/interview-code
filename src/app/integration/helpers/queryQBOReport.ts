import { Context, invariant } from '../..'
import getTableFromQBResponse from '../../formats/utils/getTableFromQBResponse'
import { halveReportPeriod } from '../../../utils/date'
import { ReportPeriod } from '../../../types'

type Props = {
  client: any
  type: string
  reportPeriod: ReportPeriod
  params: Record<string, any>
  queryCount?: number
}

const MAX_QUERY_COUNT = 5

//recursively halve the report period and query when the data gets cut off
export default async function queryQBOReport(props: Props, ctx: Context): Promise<any> {
  const { log } = ctx
  const { client, type, reportPeriod, params, queryCount = 0 } = props
  const { startDate, endDate } = reportPeriod

  invariant(
    queryCount <= MAX_QUERY_COUNT,
    'query-count-exceeded',
    `Max query count exceeded for QBO report ${type}`,
    props,
  )

  log.info(reportPeriod, `querying QBO report ${type}`)

  let generalLedgerTable: any[] = []
  let generalLedgerResponses: any[] = []

  const initialRes = await client.report(type, {
    start_date: startDate,
    end_date: endDate,
    ...params,
  })

  const table = getTableFromQBResponse(initialRes)

  const hasCutoff = table.some((row) =>
    Object.values(row).includes('Unable to display more data. Please reduce the date range.'),
  )

  log.info(hasCutoff)

  if (hasCutoff) {
    const halves = halveReportPeriod(reportPeriod)

    for (const period of halves) {
      const res = await queryQBOReport(
        {
          client,
          type,
          reportPeriod: period,
          params,
          queryCount: queryCount + 1,
        },
        ctx,
      )

      log.info({ tableLength: res.generalLedgerTable.length }, 'cutoff')
      generalLedgerTable = generalLedgerTable.concat(res.generalLedgerTable)
      generalLedgerResponses = generalLedgerResponses.concat(res.generalLedgerResponses)
    }
  } else {
    log.info({ tableLength: table.length }, 'no cutoff')
    generalLedgerTable = generalLedgerTable.concat(table)
    generalLedgerResponses.push(initialRes)
  }

  //generalLedgerTable is the concatenated list of formatted values,
  //while generalLedgerResponses is every response
  return { generalLedgerTable, generalLedgerResponses }
}
