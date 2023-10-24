// context provider not included in this sample
// @ts-ignore
import { Context } from '../..'
import getTableFromQBResponse from '../../formats/utils/getTableFromQBResponse'
import { halveReportPeriod } from '../../../utils/date'
import { ReportPeriod } from '../../../types'
import { chunkInsert } from '../../../utils/db'

type Props = {
  client: any
  reportPeriod: ReportPeriod
  params: Record<string, any>
  reportId: string
}

// query the qbo general ledger and insert the raw data into the db

// recursively halve the report period and query when the data gets cut off
export default async function queryQBOGeneralLedger(props: Props, ctx: Context): Promise<void> {
  const { log, knex } = ctx
  const { client, reportPeriod, params, reportId } = props
  const { startDate, endDate } = reportPeriod

  log.info(reportPeriod, 'querying QBO report GeneralLedger')

  const rawResponse = await client.report('GeneralLedger', {
    start_date: startDate,
    end_date: endDate,
    ...params,
  })

  const table = getTableFromQBResponse(rawResponse)

  const hasCutoff = table.some((row) =>
    Object.values(row).includes('Unable to display more data. Please reduce the date range.'),
  )

  log.info({ hasCutoff })

  if (hasCutoff) {
    const halves = halveReportPeriod(reportPeriod)

    for (const period of halves) {
      await queryQBOGeneralLedger(
        {
          client,
          reportPeriod: period,
          params,
          reportId,
        },
        ctx,
      )
    }
  } else {
    log.info({ tableLength: table.length }, 'no cutoff')

    const tableVals = table.map((rawTxn) => ({ report_id: reportId, raw_data: rawTxn }))

    await chunkInsert({ table: 'app_private.general_ledger_transactions', rows: tableVals }, ctx)

    await knex('app_private.raw_general_ledger_responses').insert({
      report_id: reportId,
      raw_response: rawResponse,
    })
  }
}
