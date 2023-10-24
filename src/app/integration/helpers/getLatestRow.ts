import { maxBy } from 'lodash'
import { Context } from '../..'

type Props = {
  tables: string[]
  condition: any
}

type Result = { maxPlatformUpdatedAt?: Date | null }

export default async function getLatestRow(props: Props, ctx: Context): Promise<Result> {
  const { knex } = ctx
  const { tables, condition } = props

  const tableResults = await Promise.all(
    tables.map((table) =>
      knex(table)
        .max('platform_updated_at', { as: 'maxPlatformUpdatedAt' })
        .where(condition)
        .first(),
    ),
  )

  return maxBy(tableResults, 'maxPlatformUpdatedAt') || { maxPlatformUpdatedAt: null }
}
