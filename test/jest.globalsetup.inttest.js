import fs from 'fs'
import { requestShutdown } from '../src/providers/shutdown'
import { knex } from '../src/providers/db'

function getTableName(table) {
  return `${table.schemaname}.${table.tablename}`
}

export default async function truncateTables() {
  const tables = await knex('pg_catalog.pg_tables')
    .select('*')
    .whereIn('schemaname', ['app_public', 'app_private'])
    .whereNotIn('tablename', ['connect_pg_simple_sessions'])

  const queries = []

  tables.forEach((table) => {
    // disable triggers so things like foreign key checks don't fail when deleting
    queries.push(`ALTER TABLE ${getTableName(table)} DISABLE TRIGGER ALL;`)
  })

  tables.forEach((table) => {
    // delete all rows in table
    queries.push(`DELETE FROM ${getTableName(table)};`)
  })

  tables.forEach((table) => {
    // disable triggers so things like foreign key checks don't fail when deleting
    queries.push(`ALTER TABLE ${getTableName(table)} ENABLE TRIGGER ALL;`)
  })

  // write output to file
  console.info('Writing truncate tables sql')

  const output = queries.join('\n')
  fs.writeFileSync('test/truncate-tables.sql', output)

  return requestShutdown()
}
