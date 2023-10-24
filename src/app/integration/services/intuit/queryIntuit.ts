import { DateTime } from 'luxon'
import { compact, map } from 'lodash'
// Context provider and invariant (error creation) not included in this sample
import { Context, invariant } from '../../../'
import getIntegration from '../../helpers/getIntegration'
import refreshIntuitIntegration from './refreshIntuitIntegration'
import queryQBOGeneralLedger from '../../helpers/queryQBOGeneralLedger'
import getLatestRow from '../../helpers/getLatestRow'
import { ReportPeriod } from '../../../../types'
import { IntuitQueryResponses } from '../../types'
import queryIntuitTransactions from './queryIntuitTransactions'
import { toISO } from '../../../../utils/date'
import getDeletedQBOEntities from '../../helpers/getDeletedQBOEntities'

type Props = {
  integrationId: string
  reportPeriod: ReportPeriod
  reportId?: string
  fetchAll?: boolean
}

const STANDARD_COLS = [
  'tx_date',
  'txn_type',
  'doc_num',
  'create_by',
  'last_mod_by',
  'create_date',
  'last_mod_date',
  'memo',
]

const GL_COLUMNS = [
  ...STANDARD_COLS,
  'name',
  'account_name',
  'klass_name',
  'is_cleared',
  'is_ar_paid',
  'is_ap_paid',
  'subt_nat_amount',
  'subt_nat_amount_nt', // not multi-currency
  'subt_nat_amount_home_nt', // multi-currency
  'debt_amt',
  'credit_amt',
  'debt_home_amt',
  'credit_home_amt',
  'nat_open_bal', // not multi-currency
  'nat_home_open_bal', // multi-currency
  'nat_foreign_open_bal', // multi-currency
  'item_name',
  'tax_amount',
  'tax_code',
  'dept_name',
]

const AR_COLUMNS = [
  ...STANDARD_COLS,
  'past_due',
  'subt_amount',
  'subt_open_bal',
  'foreign_amount', // multi-currency
  'foreign_open_bal', // multi-currency
  'cust_name',
]

const AP_COLUMNS = [
  ...STANDARD_COLS,
  'past_due',
  'subt_neg_amount',
  'subt_neg_open_bal',
  'neg_foreign_amount', // multi-currency
  'subt_neg_home_amount', // multi-currency
  'neg_foreign_open_bal', // multi-currency
  'subt_neg_home_open_bal', // multi-currency
  'vend_name',
]

const endpointTables = {
  Account: ['app_public.integration_accounts'],
  Vendor: ['app_public.integration_vendors'],
  Customer: ['app_public.integration_customers'],
  Item: ['app_public.integration_items'],
}

export default async function queryIntuit(
  props: Props,
  ctx: Context,
): Promise<IntuitQueryResponses> {
  const { knex } = ctx
  const { integrationId, reportPeriod, fetchAll, reportId } = props
  const { startDate, endDate } = reportPeriod

  const token = await refreshIntuitIntegration({ integrationId }, ctx)
  const onRefresh = () => refreshIntuitIntegration({ integrationId }, ctx)

  const client = await ctx.integration.getQboClient({ token }, onRefresh)

  // get integration
  const integration = await getIntegration({ integrationId }, ctx)
  invariant(integration, 'not-found', 'Integration not found', props)

  const platformCompanyId = integration.config.intuit.realmId
  const organizationId = integration.organization_id

  const companyProps = {
    platform: 'intuit',
    platform_company_id: platformCompanyId,
    organization_id: organizationId,
  }

  const monthBefore = DateTime.fromISO(startDate).minus({ months: 1 }).toISODate()

  const [companyInfoResponse] = await Promise.all([
    client.select({ columns: '*', entityName: 'CompanyInfo' }),
    queryIntuitTransactions({ integrationId, reportPeriod, client, fetchAll }, ctx),
    ...map(endpointTables, async (tables, endpoint) => {
      const { maxPlatformUpdatedAt } = await getLatestRow({ tables, condition: companyProps }, ctx)

      let qs = ''

      if (maxPlatformUpdatedAt && !fetchAll) {
        qs = `MetaData.LastUpdatedTime > '${toISO(maxPlatformUpdatedAt)}'`
      }

      // insert raw data into db as we page through the results. They are transformed later.
      const handleInsert = async (rows: any[]) => {
        await knex(tables[0])
          .insert(
            compact(rows).map((row) => ({
              ...companyProps,
              platform_id: row.Id,
              raw_data: row,
            })),
          )
          .onConflict(['platform', 'platform_company_id', 'platform_id', 'organization_id'])
          .merge()

        ctx.log.info(`${rows.length} rows added to ${tables[0]}`)
      }

      await client.select({
        columns: '*',
        entityName: endpoint,
        condition: qs,
        onPage: handleInsert,
      })

      await getDeletedQBOEntities({
        client,
        endpoint,
        maxPlatformUpdatedAt,
        fetchAll,
        onPage: handleInsert,
      })
    }),
  ])

  const result: IntuitQueryResponses = { platformCompanyId, organizationId, companyInfoResponse }

  // reportId is defined when running a report but not defined when querying on demand (see queryIntegrationData).
  // When querying on demand, we don't need/can't use the reports.
  if (reportId) {
    // these are the responses that are stored in S3 instead of loaded into the db
    const [
      balanceSheetResponse,
      profitAndLossResponse,
      ARDetailResponse,
      APDetailResponse,
    ] = await Promise.all([
      client.report('BalanceSheet', {
        //get one month previous for comparison
        start_date: monthBefore,
        end_date: endDate,
        accounting_method: 'Accrual',
        summarize_column_by: 'Month',
      }),
      client.report('ProfitAndLoss', {
        start_date: monthBefore,
        end_date: endDate,
        accounting_method: 'Accrual',
        summarize_column_by: 'Month',
      }),
      client.report('AgedReceivableDetail', {
        report_date: endDate,
        columns: AR_COLUMNS.join(','),
        accounting_method: 'Accrual',
        minorversion: 57,
      }),
      client.report('AgedPayableDetail', {
        report_date: endDate,
        columns: AP_COLUMNS.join(','),
        accounting_method: 'Accrual',
        minorversion: 57,
      }),
      queryQBOGeneralLedger(
        {
          client,
          reportPeriod,
          reportId,
          params: { minorversion: 57, accounting_method: 'Accrual', columns: GL_COLUMNS.join(',') },
        },
        ctx,
      ),
    ])

    result.balanceSheetResponse = balanceSheetResponse
    result.profitAndLossResponse = profitAndLossResponse
    result.ARDetailResponse = ARDetailResponse
    result.APDetailResponse = APDetailResponse
  }

  return result
}
