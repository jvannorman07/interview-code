import { DateTime, Interval } from 'luxon'
import { round } from 'lodash'
import { ReportPeriod } from '../types'

type DateType = DateTime | Date | string
type ISODate = string

export function toDateTime(value: DateType): DateTime {
  if (value instanceof DateTime) {
    return value
  }

  if (typeof value === 'string') {
    return DateTime.fromISO(value)
  }

  if (value instanceof Date) {
    return DateTime.fromJSDate(value)
  }

  throw new Error(`Invalid date value [${value}]`)
}

export function toISODate(value: DateType): ISODate {
  return toDateTime(value).toISODate()
}

export function toISO(value: DateType, options?: { includeOffset: boolean }): ISODate {
  return toDateTime(value).toISO(options)
}

export function stripTime(value: string): DateTime {
  const [date] = value.split('T')
  return toDateTime(date)
}

export function fromExcelDate(dateValue: number) {
  const initDate = DateTime.fromISO('1899-12-30T00:00:00Z')

  const dateTimeObj = initDate.plus({ days: dateValue })

  //float math wasn't up for the number of decimal places
  const rounded = round(dateTimeObj.toMillis())

  return DateTime.fromMillis(rounded)
}

// from iso date to xero query format
export function toXeroQueryDate(date: string): string {
  const dt = DateTime.fromISO(date)

  return `DateTime(${dt.year},${dt.month},${dt.day})`
}

export function toXeroDateRange(
  start: string,
  end?: string,
  endpoint?: string,
  options?: { excludeEndDate?: Boolean },
): string {
  const xeroStart = toXeroQueryDate(start)

  //expense claims is deprecated endpoint, but we still want the data
  const dateField = endpoint === 'ExpenseClaims' ? 'ReportingDate' : 'Date'

  //spaces are necessary
  const qs = `${dateField} >= ${xeroStart}`

  if (!end) {
    return qs
  }

  const xeroEnd = toXeroQueryDate(end)

  //sometimes we need to exclude the end date
  const operator = options?.excludeEndDate ? '<' : '<='

  return qs.concat(` && ${dateField} ${operator} ${xeroEnd}`)
}

export function halveReportPeriod(reportPeriod: ReportPeriod): ReportPeriod[] {
  const { startDate, endDate } = reportPeriod

  const startDateDt = DateTime.fromISO(startDate)
  const endDateDt = DateTime.fromISO(endDate)
  const days = Interval.fromDateTimes(startDateDt, endDateDt).count('days')

  //use whole days to avoid overlap, e.g. 29 -> 15/14
  const midpointDt = startDateDt.plus({ days: Math.ceil(days / 2) - 1 })

  return [
    { startDate, endDate: midpointDt.toISODate() },
    { startDate: midpointDt.plus({ days: 1 }).toISODate(), endDate },
  ]
}

export function fromFormatToISODate(date: string, format: string): string {
  const dt = DateTime.fromFormat(date, format)

  if (dt.isValid) {
    return dt.toISODate()
  }

  return date
}

export function validateDate(date: string): boolean {
  return toDateTime(date).isValid
}
