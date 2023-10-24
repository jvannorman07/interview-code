import { Context } from '../..'
import { compact, cloneDeep } from 'lodash'
import { ResponseTransaction } from '../../types/general'
import { getQBOEntityKey } from '../utils/general'
import {
  getQBOLinkedTxnRefs,
  addLinkedTxnsFromList,
  getQBOMissingRefs,
} from '../utils/linkedTransactions'
import { QBOLinkedTxnEndpoints } from '../constants'
import { pascalCase } from '../../../utils/string'

type Props = {
  client: any
  transactions: ResponseTransaction[]
}

export default async function addQBOLinkedTransactions(
  props: Props,
  ctx: Context,
): Promise<ResponseTransaction[]> {
  const { client, transactions } = props

  // get flat list of refs for linked transactions
  const linkedTxnRefs = getQBOLinkedTxnRefs({ transactions })

  // get list of refs that reference transactions not already in the list
  const missingRefs = getQBOMissingRefs({ transactions, txnRefs: linkedTxnRefs })

  // query for missing transactions
  let missingTxns: ResponseTransaction[] = []

  await Promise.all(
    QBOLinkedTxnEndpoints.map(async (endpoint) => {
      try {
        const entityKey = getQBOEntityKey(endpoint)

        const endpointMissingRefs = missingRefs.filter(
          (ref) => pascalCase(ref.TxnType) === endpoint,
        )

        if (!endpointMissingRefs.length) {
          return
        }

        // ids wrapped in single quotes for query
        const missingIds = endpointMissingRefs.map((ref) => `'${ref.TxnId}'`)
        const condition = `Id in (${missingIds.join(', ')})`

        const response = await client.select({
          columns: '*',
          entityName: endpoint,
          condition,
          entityKey,
        })

        const txns = compact(response.QueryResponse?.[entityKey])

        missingTxns = missingTxns.concat(
          txns.map((transaction) => ({
            endpoint,
            transaction,
            linkedTransactions: [],
          })),
        )
      } catch (err: any) {
        ctx.log.error('Error querying linked transactions', err)
      }
    }),
  )

  // full list of transactions, including missing
  const allTxns = cloneDeep(transactions).concat(missingTxns)

  // add linked transactions to prop on each transaction
  return addLinkedTxnsFromList({ transactions: allTxns, linkedTxnRefs })
}
