import { compact, flatten, pick, cloneDeep } from 'lodash'
import { ResponseTransaction } from '../../types/general'
import { QBOLinkedTxnEndpoints } from '../constants'
import { LinkedTxnRef } from '../types'

type GetLinkedTxnRefsProps = {
  transactions: ResponseTransaction[]
}

// create flat list of linked transaction refs with parent transaction id
export function getQBOLinkedTxnRefs(props: GetLinkedTxnRefsProps): LinkedTxnRef[] {
  const { transactions } = props

  const linkedTxnTransactions = transactions.filter((responseTxn) =>
    QBOLinkedTxnEndpoints.includes(responseTxn.endpoint),
  )

  return compact(
    flatten(
      linkedTxnTransactions.map(({ transaction }) =>
        transaction.Line.map((line) => {
          const txnRef = line?.LinkedTxn?.[0]

          return txnRef
            ? { ...pick(txnRef, ['TxnType', 'TxnId']), parentTxnId: transaction.Id }
            : null
        }),
      ),
    ),
  )
}

type GetMissingRefsProps = {
  transactions: ResponseTransaction[]
  txnRefs: LinkedTxnRef[]
}

export function getQBOMissingRefs(props: GetMissingRefsProps): LinkedTxnRef[] {
  const { transactions, txnRefs } = props

  return txnRefs.filter(
    (ref) => !transactions.find(({ transaction }) => ref.TxnId === transaction.Id),
  )
}

type AddLinkedProps = {
  transactions: ResponseTransaction[]
  linkedTxnRefs: LinkedTxnRef[]
}

// take list of response transactions and add the linked transactions to each that requires it
export function addLinkedTxnsFromList(props: AddLinkedProps): ResponseTransaction[] {
  const { transactions, linkedTxnRefs } = props

  const resultTxns: ResponseTransaction[] = cloneDeep(transactions)

  // if linked transaction is already in list, add it to linked transactions object on the transaction.
  // Otherwise, add it to missing list to query for.
  linkedTxnRefs.forEach((ref) => {
    const { TxnId, parentTxnId } = ref

    const listTxn = resultTxns.find(({ transaction }) => transaction.Id === TxnId)?.transaction

    if (listTxn) {
      const parentTxn = resultTxns.find(({ transaction }) => transaction.Id === parentTxnId)

      parentTxn!.linkedTransactions.push(listTxn)
    }
  })

  return resultTxns
}
