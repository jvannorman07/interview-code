import { QueryBuilder } from 'knex'
import { chunk } from 'lodash'
// Context provider not included in this sample
// @ts-ignore
import { Context } from '../app'
import { deduplicateArray } from './object'

type ConflictStrategy = 'merge' | 'ignore'

function handleConflict(
  query: QueryBuilder,
  uniqueColumns?: string[],
  onConflict?: ConflictStrategy,
): QueryBuilder {
  if (uniqueColumns) {
    if (onConflict === 'merge') {
      return query.onConflict(uniqueColumns).merge()
    }

    return query.onConflict(uniqueColumns).ignore()
  }

  return query
}

type ChunkInsertProps = {
  rows: any[]
  table: string
  uniqueColumns?: string[]
  onConflict?: ConflictStrategy
  chunkSize?: number
}

export async function chunkInsert(props: ChunkInsertProps, ctx: Context): Promise<void> {
  const { knex, log } = ctx
  const { rows, table, uniqueColumns, onConflict = 'merge', chunkSize = 1000 } = props

  // manually deduplicate because "on conflict" doesn't apply to batch inserts
  const uniqueRows = uniqueColumns ? deduplicateArray(rows, uniqueColumns) : rows

  const chunks = chunk(uniqueRows, chunkSize)

  for (const chunk of chunks) {
    const q = knex(table).insert(chunk)

    await handleConflict(q, uniqueColumns, onConflict)

    log.info(`${chunk.length} rows added to ${table}`)
  }
}
