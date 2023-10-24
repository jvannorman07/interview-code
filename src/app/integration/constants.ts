import { TableFields } from './types'

export const xeroTransactionEndpoints = [
  'Invoices',
  'CreditNotes',
  'Payments',
  'BankTransactions',
  'BankTransfers',
  'Prepayments',
  'Overpayments',
  'ExpenseClaims',
  'ManualJournals',
]

//maps xero transaction types to general types.
//Note: xero classifies both ACCREC and ACCPAY as invoices, but we classify them as
//bills and invoices respectively
export const xeroTransactionTypes = {
  ACCREC: 'invoice',
  ACCPAY: 'bill',
  ACCRECCREDIT: 'creditNote',
  ACCPAYCREDIT: 'creditNote',
  ACCRECPAYMENT: 'payment',
  ACCPAYPAYMENT: 'payment',
  ARCREDITPAYMENT: 'payment',
  APCREDITPAYMENT: 'payment',
  CASHREC: 'bankTransaction',
  CASHPAID: 'bankTransaction',
  TRANSFER: 'bankTransfer',
  ARPREPAYMENT: 'prepayment',
  APPREPAYMENT: 'prepayment',
  AROVERPAYMENT: 'overpayment',
  APOVERPAYMENT: 'overpayment',
  EXPCLAIM: 'expenseClaim',
  EXPPAYMENT: 'payment',
  MANJOURNAL: 'manualJournal',
  INTEGRATEDPAYROLLPT: 'payment',
  EXTERNALSPENDMONEY: 'payment',
  INTEGRATEDPAYROLLPTPAYMENT: 'payment',
  INTEGRATEDPAYROLLCN: 'creditNote',
}

// case insensitive for querying, but must be all lowercase for reading/updating a single
// transaction. Response objects are keyed with pascal case like below.
export const QBOTransactionEndpoints = [
  'CreditMemo',
  'Invoice',
  'Payment',
  'RefundReceipt',
  'Purchase',
  'SalesReceipt',
  'Deposit',
  'Bill',
  'BillPayment',
  'CreditCardPayment',
  'VendorCredit',
  'Transfer',
  'JournalEntry',
]

export const QBOLinkedTxnEndpoints = ['Deposit', 'Payment', 'BillPayment']

export const tableFieldsMap: Record<string, TableFields> = {
  'app_public.integration_accounts': {
    id: 'accountId',
    name: 'accountName',
    parentId: 'parentAccountId',
    transactionMatch: 'transactionAccountId',
  },
  'app_public.integration_customers': {
    id: 'customerId',
    name: 'customerFullyQualifiedName',
    parentId: 'parentCustomerId',
    transactionMatch: 'transactionEntityId',
  },
  'app_public.integration_vendors': {
    id: 'vendorId',
    name: 'vendorFullyQualifiedName',
    parentId: 'parentVendorId',
    transactionMatch: 'transactionEntityId',
  },
}

export const tableEndpoints: Record<string, string> = {
  'app_public.integration_accounts': 'Account',
  'app_public.integration_customers': 'Customer',
  'app_public.integration_vendors': 'Vendor',
}

export const bulkDeactivateEntityMap = {
  vendor: 'app_public.integration_vendors',
  customer: 'app_public.integration_customers',
  account: 'app_public.integration_accounts',
}
