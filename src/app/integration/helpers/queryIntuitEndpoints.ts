import { Context } from '../..'
import { compact, chunk } from 'lodash'
import { QBOTransactionEndpoints } from '../constants'
import { ResponseTransaction } from '../../types/general'
import addQBOLinkedTransactions from './addQBOLinkedTransactions'
import { getQBOEntityKey } from '../utils/general'
import { chunkInsert } from '../../../utils/db'

type Props = {
  client: any
  qs: string
  platformCompanyId: string
  organizationId: string
}

export default async function queryIntuitEndpoints(props: Props, ctx: Context): Promise<void> {
  const { knex } = ctx
  const { client, qs, platformCompanyId, organizationId } = props

  const handleInsert = async (rows: any[], endpoint: string) => {
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
      .onConflict(['platform', 'platform_company_id', 'platform_transaction_id', 'organization_id'])
      .merge()

    ctx.log.info(`${rows.length} rows added to app_public.integration_transactions`)
  }

  let transactions: any[] = []

  const endpointGroups = chunk(QBOTransactionEndpoints, 10)

  // base transactions first. Group to avoid concurrency limits
  for (const endpointGroup of endpointGroups) {
    await Promise.all(
      endpointGroup.map(async (endpoint) => {
        const entityKey = getQBOEntityKey(endpoint)

        const res = await client.select({
          columns: '*',
          entityName: endpoint,
          condition: qs,
          entityKey,
          onPage: (rows) => handleInsert(rows, endpoint),
        })

        const data = compact(res.QueryResponse?.[endpoint])

        transactions = transactions.concat(
          data.map((transaction) => ({ endpoint, transaction, linkedTransactions: [] })),
        )
      }),
    )
  }

  // then linked transactions
  transactions = await addQBOLinkedTransactions({ client, transactions }, ctx)

  const linkedTxnTxns: ResponseTransaction[] = transactions.filter(
    (transaction) => transaction.linkedTransactions.length,
  )

  // update db column with linked transactions
  const linkedTxnRows = linkedTxnTxns.map((txn) => ({
    platform: 'intuit',
    platform_company_id: platformCompanyId,
    organization_id: organizationId,
    platform_transaction_id: txn.transaction.Id,
    linked_transactions: txn.linkedTransactions,
  }))

  await chunkInsert(
    {
      rows: linkedTxnRows,
      table: 'app_public.integration_transactions',
      uniqueColumns: [
        'platform',
        'platform_company_id',
        'platform_transaction_id',
        'organization_id',
      ],
    },
    ctx,
  )
}
