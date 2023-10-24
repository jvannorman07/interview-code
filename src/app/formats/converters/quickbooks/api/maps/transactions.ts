import { Transaction } from '../../../../types'

const detailTypeDestinations: Record<string, Record<string, string>> = {
  SalesItemLineDetail: {
    lineItem: 'SalesItemLineDetail.ItemRef.name',
    lineItemId: 'SalesItemLineDetail.ItemRef.value',
    lineQuantity: 'SalesItemLineDetail.Qty',
    lineRate: 'SalesItemLineDetail.UnitPrice',
  },
  AccountBasedExpenseLineDetail: {
    lineAccount: 'AccountBasedExpenseLineDetail.AccountRef.name',
    lineAccountId: 'AccountBasedExpenseLineDetail.AccountRef.value',
  },
  JournalEntryLineDetail: {
    lineAccount: 'JournalEntryLineDetail.AccountRef.name',
    lineAccountId: 'JournalEntryLineDetail.AccountRef.value',
  },
  ItemBasedExpenseLineDetail: {
    lineItem: 'ItemBasedExpenseLineDetail.ItemRef.name',
    lineItemId: 'ItemBasedExpenseLineDetail.ItemRef.value',
    lineQuantity: 'ItemBasedExpenseLineDetail.Qty',
    lineRate: 'ItemBasedExpenseLineDetail.UnitPrice',
  },
}

// we can't use array accessors for the line update map, because we sometimes use it to populate it a blank object
// (no destination to reference)
export const transactionLineUpdateMap = {
  lineId: 'Id',
  // descriptions can be set to null
  lineDescription: { path: 'Description', shouldSet: true, nullable: true },
  lineAccount: ({ lineDetailType }) => detailTypeDestinations[lineDetailType].lineAccount,
  lineAccountId: ({ lineDetailType }) => detailTypeDestinations[lineDetailType].lineAccountId,
  lineItem: ({ lineDetailType }) => detailTypeDestinations[lineDetailType].lineItem,
  lineItemId: ({ lineDetailType }) => detailTypeDestinations[lineDetailType].lineItemId,
  lineQuantity: ({ lineDetailType }) => detailTypeDestinations[lineDetailType].lineQuantity,
  lineRate: ({ lineDetailType }) => detailTypeDestinations[lineDetailType].lineRate,
  lineAmount: 'Amount',
  linePostingType: 'JournalEntryLineDetail.PostingType',
  lineDetailType: 'DetailType',
  lineEntity: (src, parentObj) => {
    const { transactionType } = parentObj

    if (transactionType === 'journalEntry') {
      return { path: 'JournalEntryLineDetail.Entity.EntityRef.name', shouldSet: true }
    }

    return null
  },
  lineEntityId: (src, parentObj) => {
    const { transactionType } = parentObj

    if (transactionType === 'journalEntry') {
      return { path: 'JournalEntryLineDetail.Entity.EntityRef.value', shouldSet: true }
    }

    return null
  },
}

const getEntityRef = (endpoint: string, entityType?: string | null): string | null => {
  if (endpoint === 'Purchase') {
    return 'EntityRef'
  }

  if (entityType === 'customer') {
    return 'CustomerRef'
  }

  if (entityType === 'vendor') {
    return 'VendorRef'
  }

  return null
}

const salesTransactionTypes = ['invoice', 'creditMemo', 'salesReceipt', 'refundReceipt']

// map for converting updated, formatted transaction data back into raw object for api update call
export const transactionUpdateMap = {
  transactionId: 'Id',
  transactionNum: ({ transactionType }: Transaction) => {
    if (transactionType === 'payment') {
      return { path: 'PaymentRefNum', shouldSet: true }
    }

    return { path: 'DocNumber', shouldSet: true }
  },
  transactionEntityName: ({ transactionEndpoint, transactionEntityType }: Transaction) => {
    const basePath = getEntityRef(transactionEndpoint, transactionEntityType)

    if (basePath) {
      return { path: `${basePath}.name`, shouldSet: true }
    }

    return null
  },
  transactionEntityId: ({ transactionEndpoint, transactionEntityType }: Transaction) => {
    const basePath = getEntityRef(transactionEndpoint, transactionEntityType)

    if (basePath) {
      return { path: `${basePath}.value`, shouldSet: true }
    }

    return null
  },
  transactionEntityBillAddress: ({ transactionType }: Transaction) => {
    if (salesTransactionTypes.includes(transactionType)) {
      return { path: 'BillAddr', shouldSet: true, nullable: true }
    }

    return 'BillAddr'
  },
  transactionEntityShipAddress: ({ transactionType }: Transaction) => {
    if (salesTransactionTypes.includes(transactionType)) {
      return { path: 'ShipAddr', shouldSet: true, nullable: true }
    }

    return 'ShipAddr'
  },
  transactionEntityEmail: ({ transactionType }: Transaction) => {
    if (salesTransactionTypes.includes(transactionType)) {
      return { path: 'BillEmail.Address', shouldSet: true, nullable: true }
    }

    return 'BillEmail.Address'
  },
  transactionDate: 'TxnDate',
  transactionAmount: ['TotalAmt', 'Amount'],
  transactionAccount: [
    'DepositToAccountRef.name',
    'CheckPayment.BankAccountRef.name',
    'CreditCardPayment.CCAccountRef.name',
  ],
  transactionAccountId: [
    'DepositToAccountRef.value',
    'CheckPayment.BankAccountRef.value',
    'CreditCardPayment.CCAccountRef.value',
  ],
  syncToken: 'SyncToken',
  transactionFromAccount: ['FromAccountRef.name', 'BankAccountRef.name'],
  transactionFromAccountId: ['FromAccountRef.value', 'BankAccountRef.value'],
  transactionToAccount: ['ToAccountRef.name', 'CreditCardAccountRef.name'],
  transactionToAccountId: ['ToAccountRef.value', 'CreditCardAccountRef.value'],
  transactionLines: {
    arrayAccessor: 'Line',
    arrayMatcher: ['lineId', 'Id'],
    arrayMap: transactionLineUpdateMap,
  },
  addLines: {
    arrayAccessor: 'Line',
    arrayMap: transactionLineUpdateMap,
    shouldSet: true,
  },
  deleteLines: {
    arrayAccessor: 'Line',
    arrayMatcher: ['lineId', 'Id'],
    shouldDelete: true,
  },
}
