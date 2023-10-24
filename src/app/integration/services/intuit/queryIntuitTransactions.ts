import { DateTime } from 'luxon'
// Context provider and invariant (error creation) not included in this sample
// @ts-ignore
import { Context, invariant } from '../../..'
import getTransactionRange from '../../helpers/getTransactionRange'
import getIntegration from '../../helpers/getIntegration'
import { toDateTime, toISODate } from '../../../../utils/date'
import { ReportPeriod } from '../../../../types'
import queryIntuitEndpoints from '../../helpers/queryIntuitEndpoints'

type Props = {
  integrationId: string
  reportPeriod: ReportPeriod
  client: any
  fetchAll?: boolean
}

export default async function queryIntuitTransactions(props: Props, ctx: Context): Promise<void> {
  const { integrationId, reportPeriod, client, fetchAll } = props
  const { startDate } = reportPeriod

  const integration = await getIntegration({ integrationId }, ctx)
  invariant(integration, 'not-found', 'Integration not found', props)

  const platformCompanyId = integration.config.intuit.realmId || integration.secrets.token.realmId
  const organizationId = integration.organization_id

  const { minTransactionDate, maxPlatformUpdatedAt } = await getTransactionRange(
    { platform: 'intuit', platformCompanyId, organizationId },
    ctx,
  )

  const baseQs = `TxnDate >= '${startDate}'`

  if (minTransactionDate) {
    const minTransactionDt = toDateTime(minTransactionDate)
    const minTransactionISO = minTransactionDt.toISODate()

    const priorQuerying = DateTime.fromISO(startDate) < minTransactionDt

    if (priorQuerying) {
      const qs = baseQs.concat(` AND TxnDate < '${minTransactionISO}'`)

      await queryIntuitEndpoints({ client, qs, platformCompanyId, organizationId }, ctx)
    }
  }

  let qs = baseQs

  // optionally use last updated
  if (maxPlatformUpdatedAt && !fetchAll) {
    qs = baseQs.concat(` AND MetaData.LastUpdatedTime > '${toISODate(maxPlatformUpdatedAt)}'`)
  }

  await queryIntuitEndpoints({ client, qs, platformCompanyId, organizationId }, ctx)
}
