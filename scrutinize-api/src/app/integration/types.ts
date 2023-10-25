import { ReportPeriod } from '../../types'

export type IntuitQueryResponse<Entity extends string> = {
  QueryResponse: {
    [key in Entity]: any[]
  }
}

export type IntegrationKind = 'intuit' | 'xero' | 'plaid'
export type IntegrationStatus = 'draft' | 'enabled' | 'disabled' | 'suspended'

export type IntuitConfig = {}

export type IntegrationConfig = {
  intuit?: IntuitConfig
  xero?: any
  plaid?: any
}

export type IntuitQueryResponses = {
  companyInfoResponse: IntuitQueryResponse<string>
  accountListResponse?: IntuitQueryResponse<string>
  vendorListResponse?: IntuitQueryResponse<string>
  customerListResponse?: IntuitQueryResponse<string>
  generalLedgerTable?: any[]
  generalLedgerResponses?: any[]
  transactionList?: any[]
  balanceSheetResponse?: any
  profitAndLossResponse?: any
  platformCompanyId: string
  organizationId: string
  itemListResponse?: IntuitQueryResponse<string>
  ARDetailResponse?: any
  APDetailResponse?: any
}

export type XeroQueryResponses = {
  organisationList: any
  accountList: any
  contactList: any
  balanceSheetResponse: { reportTable: any[]; reportResponses: any[] }
  profitAndLossResponse: { reportTable: any[]; reportResponses: any[] }
  platformCompanyId: string
  organizationId: string
}

export type LinkedTxnRef = {
  TxnType: string
  TxnId: string
  parentTxnId: string
}

export type QBORawTransaction = Partial<{
  Id: string
  Line: Record<string, any>
}>

export type TableFields = {
  id: string
  parentId: string
  transactionMatch: string
  name: string
}

export type UpdateRow = {
  data: Record<string, any>
  raw_data: Record<string, any>
}

export type ResponseTransaction = {
  endpoint: string
  transaction: any
  linkedTransactions: any[]
}

export type PlatformCompanyProps = {
  platformCompanyId: string | null
  organizationId: string
  platform?: string | null
  integrationId?: string | null
  reportPeriod?: ReportPeriod
}

export type HandlerInputProps = PlatformCompanyProps & { reportId?: string }

export type SourceKind = 'qb:xlsx:desktop' | 'qb:xlsx' | 'qb:json' | 'xero:json'
