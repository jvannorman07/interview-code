import { pascalCase } from '../../../utils/string'
import { IntuitQueryResponses, XeroQueryResponses } from '../types'
import { ReportPeriod } from '../../../types'

export function createIntuitFileKindMap(
  integrationData: IntuitQueryResponses,
  reportPeriod: ReportPeriod,
): Record<string, any> {
  const {
    companyInfoResponse,
    balanceSheetResponse,
    profitAndLossResponse,
    ARDetailResponse,
    APDetailResponse,
  } = integrationData

  // these are the data that are still updated to S3, and then downloaded at the processing stage. Everything
  // else uses the db – it queries the db, formats in place, and returns the list of formatted data.
  // Potentially to do: upload the rest of the raw data to S3 anyway, but do it asynchronously so the report
  // doesn't have to wait on it.
  // Also, we might be able to add the rest of these to the db in some format to eliminate synchronous upload/download completely
  // in the report process.
  return {
    'qb:json:company-info': { companyInfoResponse },
    'qb:json:balance-sheet': { balanceSheetResponse, reportPeriod },
    'qb:json:profit-and-loss': { profitAndLossResponse, reportPeriod },
    'qb:json:ar-detail': { ARDetailResponse },
    'qb:json:ap-detail': { APDetailResponse },
  }
}

export function getQBOEntityKey(endpoint: string): string {
  if (endpoint === 'CreditCardPayment') {
    return 'CreditCardPaymentTxn'
  }

  return endpoint
}
