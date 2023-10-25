import { DateTime } from 'luxon'
import { forEach, pick } from 'lodash'
import { Context, AppError, invariant } from '../..'
import executeHandlers from '../../formats/helpers/executeHandlers'
import queryIntuit from './intuit/queryIntuit'
import { createIntuitFileKindMap, createXeroFileKindMap } from '../utils/general'
import { scrutinizeJsonSourceConverters } from '../../formats/converters'
import getIntegration from '../helpers/getIntegration'
import queryXero from './xero/queryXero'
import getSourceKindByIntegration from '../helpers/getSourceKindByIntegration'

type Props = {
  integrationId: string
  startDate: string
  fetchAll?: boolean
}

// query integration data and store it in the db
export default async function queryIntegrationData(props: Props, ctx: Context) {
  const { integrationId, startDate, fetchAll } = props

  try {
    const integration = await getIntegration({ integrationId }, ctx)

    // the query functions always go to the present, so endDate is not necessary in this context
    const reportPeriod = { startDate, endDate: DateTime.utc().toISO() }

    let fileKindMap: any = null
    let platformCompanyId: string | null = null

    switch (integration.kind) {
      case 'intuit':
        const intuitIntegrationData = await queryIntuit(
          { integrationId, reportPeriod, fetchAll },
          ctx,
        )

        // create mapping of file kinds to query data
        fileKindMap = createIntuitFileKindMap(intuitIntegrationData, reportPeriod)

        platformCompanyId = integration.config.intuit.realmId

        break

      case 'xero':
        const xeroIntegrationData = await queryXero({ integrationId, reportPeriod, fetchAll }, ctx)

        fileKindMap = createXeroFileKindMap(xeroIntegrationData, reportPeriod)

        platformCompanyId = integration.config.xero.currentTenant.tenantId

        break

      default:
        throw new AppError('invalid-integration', 'Invalid integration kind', {
          kind: integration.kind,
        })
    }

    const inputFiles = Object.entries(fileKindMap).map(([kind, data]) => ({
      kind,
      get: async () => data,
      put: async () => {},
    }))

    const sourceKind = await getSourceKindByIntegration({ integrationId }, ctx)
    invariant(sourceKind, 'not-found', 'Source kind not found', props)

    const handlers: Record<string, any> = {}

    // only execute handlers for integration data that's mapped to a platform company id in the db.
    // We don't need to include the general ledger (which requires a report) or the formatters that only return json
    forEach(scrutinizeJsonSourceConverters, (dataKindHandlers, sourceKind) => {
      handlers[sourceKind] = pick(dataKindHandlers, [
        'account-list',
        'vendor-contact-list',
        'customer-contact-list',
        'transaction-list',
        'item-list',
        'journal-list',
      ])
    })

    await executeHandlers(
      {
        inputFiles,
        handlers,
        sourceKind,
        inputProps: {
          platform: integration.kind,
          platformCompanyId,
          organizationId: integration.organization_id,
          integrationId,
          reportPeriod,
        },
      },
      ctx,
    )
  } catch (error: any) {
    ctx.log.error('Error querying integration data', { error, props, stack: error.stack })
  }
}
