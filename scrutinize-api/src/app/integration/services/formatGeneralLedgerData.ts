import { Context } from '../..'
import formatGeneralLedger from '../../formats/converters/quickbooks/api/formatters/formatGeneralLedger'
import { Account, Transaction } from '../../formats/types'
import { formatGLTransactionsForDb } from '../../formats/utils/formatting'

type Props = {
  reportId: string
  accounts: Account[]
  payments: Transaction[]
  platform: string
  platformCompanyId: string
}

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
