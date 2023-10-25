# scrutinize-api

Shareable sample of Scrutinize api content, including transformation utils, intuit api querying and loading, and an example db migration.

For general code and data manipulation examples, see src/app/utils/transform.ts and src/app/utils/mapToDestination.ts.

## High level overview of Intuit integration data ELT

1. Extract: The extraction process begins with the [queryIntegrationData](./src/app/integration/services/queryIntegrationData.ts) function. This function takes in an integrationId and a startDate as parameters, and optionally a fetchAll flag (fetchAll = true fetches all data since the startDate instead of using the date of the last data sync). Depending on the type of integration (Intuit or Xero), it calls either queryIntuit or queryXero to fetch the data from the respective service.

```ts
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
    ```

2. Extract - Intuit: If the integration is of type 'intuit', the [queryIntuit](./src/app/integration/services/intuit/queryIntuit.ts) function is called. This function fetches data from various Intuit endpoints.

```ts
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

      // insert raw data into db as we page through the results
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
```

3. Load: As the raw data is fetched, it is loaded into the database. This is done in several places, such as in the [queryIntuitEndpoints](./src/app/integration/helpers/queryIntuitEndpoints.ts) function, where each page of transactions is inserted into app_public.integration_transactions.

```ts
export default async function queryIntuitEndpoints(props: Props, ctx: Context): Promise<void> {
  const { knex } = ctx
  const { client, qs, platformCompanyId, organizationId } = props

  let transactions: any[] = []

  const endpointGroups = chunk(QBOTransactionEndpoints, 10)

  // base transactions first. Group to avoid concurrency limits
  for (const endpointGroup of endpointGroups) {
    await Promise.all(
      endpointGroup.map(async (endpoint) => {
        const entityKey = getQBOEntityKey(endpoint)

        const handleInsert = async (rows: any[]) => {
          await knex('app_public.integration_transactions')
            .insert(
              rows.map((row) => ({
                platform: 'intuit',
                platform_company_id: platformCompanyId,
                organization_id: organizationId,
                platform_transaction_id: row.Id,
                endpoint,
                raw_transaction_data: row,
              })),
            )
            .onConflict([
              'platform',
              'platform_company_id',
              'platform_transaction_id',
              'organization_id',
            ])
            .merge()

          ctx.log.info(`${rows.length} rows added to app_public.integration_transactions`)
        }

        const res = await client.select({
          columns: '*',
          entityName: endpoint,
          condition: qs,
          entityKey,
          onPage: handleInsert,
        })

        const data = compact(res.QueryResponse?.[endpoint])

        transactions = transactions.concat(
          data.map((transaction) => ({ endpoint, transaction, linkedTransactions: [] })),
        )
      }),
    )
  }
```

4. Transform: The [executeHandlers](./src/app/integration/services/queryIntegrationData.ts?plain=1#L84) function maps data types to individual handlers in charge of transforming data in the database. For example, general ledger data is formatted by [formatGeneralLedgerData](/src/app/integration/services/formatGeneralLedgerData.ts), which loops through the rows of raw data in the app_private.general_ledger_transactions table and populates the formatted data columns based on a transformation mapping.

```ts
export default async function formatGeneralLedgerData(props: Props, ctx: Context): Promise<void> {
  const { knex } = ctx
  const { reportId, accounts, payments, platform, platformCompanyId } = props

  let rowsToUpdate: any[] = []

  do {
    rowsToUpdate = await knex('app_private.general_ledger_transactions')
      .select('id', 'raw_data')
      .where({ report_id: reportId })
      .limit(200)
      .whereNull('platform_transaction_id')

    if (!rowsToUpdate?.length) {
      break
    }

    const { generalLedgerTransactions } = formatGeneralLedger({
      generalLedgerTable: rowsToUpdate.map((row) => ({ id: row.id, ...row.raw_data })),
      accounts,
      payments,
    })

    const insertRows = formatGLTransactionsForDb({
      platform,
      platformCompanyId,
      generalLedgerTransactions,
      reportId,
    })

    await knex('app_private.general_ledger_transactions')
      .insert(insertRows)
      .onConflict(['id'])
      .merge()
  } while (rowsToUpdate.length)
}
```