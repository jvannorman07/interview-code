import { findObjectsWithProperty } from './properties'
import { map } from 'lodash'

export default function getTableFromQBResponse(qbResponse: { Header; Rows; Columns }) {
  //this function pushes objects with 'ColTitle' to columns array
  const columns = findObjectsWithProperty({ object: qbResponse, key: 'ColTitle' })

  const columnValues = columns.map((column) => column.ColTitle)

  const rows = findObjectsWithProperty({ object: qbResponse, key: 'ColData' })

  // map special props to column indexes
  const specialIdxs = {
    //the transaction id comes through as the id of the
    //transaction type field for some reason, e.g. {value: 'Bill Payment', id: 145}
    transactionId: columnValues.indexOf('Transaction Type'),
    accountId: columnValues.indexOf('Account'),
    // 'Name' idx for the general ledger, customer and vendor indices for ar and ap aging reports
    entityId: columnValues.indexOf('Name'),
    customerId: columnValues.indexOf('Customer'),
    vendorId: columnValues.indexOf('Vendor'),
  }

  const dataRows = rows
    .filter((row) => row.type === 'Data' || row.type === 'data')
    .map((dataRow) => dataRow.ColData)

  const table: any[] = []

  for (const row of dataRows) {
    //empty rows, sometimes with 'Beginning Balance' as first value
    if (row[0].value === 'Beginning Balance' || row.every((item) => !item?.value?.length)) {
      continue
    }

    const obj: any = {}

    for (let i = 0; i < columnValues.length; i++) {
      obj[columnValues[i]] = row[i].value
    }

    map(specialIdxs, (idx, key) => {
      if (row[idx]?.id) {
        obj[key] = row[idx]?.id
      }
    })

    table.push(obj)
  }

  return table
}
