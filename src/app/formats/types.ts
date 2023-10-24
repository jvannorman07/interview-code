export type EntityType = 'vendor' | 'customer'

export type TransactionLine = {
  lineId: string | null
  lineNum: string | null
  lineDescription: string | null
  lineAccount?: string | null
  lineAccountId?: string | null
  lineAccountType?: string | null
  //these refer to products/services
  lineItem?: string | null
  lineItemId?: string | null
  lineDebit?: number | null
  lineCredit?: number | null
  lineOriginalAmount?: number | null
  lineAmount?: number | null
  lineQuantity?: number | null
  lineRate?: number | null
  lineLinkedTransactionId?: string | null
  lineLinkedTransactionLineId?: string | null
  lineEntity?: string | null
  lineEntityId?: string | null
  lineEntityType?: EntityType | null
  lineType?: string | null
  lineDate?: string | null
  lineOpenBalance?: number | null
  lineLinkedTransactionNum?: string | null
  linePostingType?: string | null
  lineDetailType?: string | null
  lineTaxable?: boolean | null
  addLine?: boolean | null
  deleteLine?: boolean | null
}

export type TaxLine = {
  transactionTaxableAmount: number | null
  // percentage as number, e.g. 8 for 8%
  transactionTaxPercent: number | null
  taxLineAmount: number | null
}

export type Transaction = {
  transactionId: string
  transactionType: string
  transactionEndpoint: string
  transactionEntityName: string | null
  transactionEntityId: string | null
  transactionEntityType: EntityType | null
  transactionEntityBillAddress?: Record<string, any>
  transactionEntityShipAddress?: Record<string, any>
  transactionEntityEmail?: string
  transactionAmount: number | null
  transactionDate: string | null
  transactionAccount: string | null
  transactionAccountId: string | null
  transactionFromAccount?: string | null
  transactionFromAccountId?: string | null
  transactionToAccount?: string | null
  transactionToAccountId?: string | null
  transactionNum: string | null
  transactionCreatedTime: string | null
  transactionLastUpdatedTime: string | null
  transactionCreatedBy?: string | null
  transactionLastUpdatedBy?: string | null
  transactionReconciled?: 'R' | null
  repeatingTransactionId?: string | null
  transactionARPaid?: string | null
  transactionAPPaid?: string | null
  transactionLines: TransactionLine[]
  transactionUnappliedAmount?: number | null
  transactionTaxAmount?: number | null
  // whole number for tax rate, e.g. 8 for 8%
  transactionTotalTaxRate?: number | null
  transactionTaxAfterDiscount?: boolean | null
  transactionTaxLines?: TaxLine[]
  transactionLinkedTransactionId?: string
  transactionLinkedTransactionType?: string
}

export type Item = {
  itemId: string | null
  itemName: string | null
  itemType: string | null
  itemActive: boolean | null
  itemAssetAccount: string | null
  itemAssetAccountId: string | null
  itemExpenseAccount: string | null
  itemExpenseAccountId: string | null
  itemIncomeAccount: string | null
  itemIncomeAccountId: string | null
  itemCreatedTime: string | null
  itemLastUpdatedTime: string | null
}
