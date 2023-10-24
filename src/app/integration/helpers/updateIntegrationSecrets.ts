// Context provider not included in this sample
import { Context } from '../../../'

type Props = {
  integrationId: string
  details: any
  expiresAt: string
  useTransaction: boolean
}

export default async function updateIntegrationSecrets(props: Props, ctx: Context): Promise<any> {
  const { integrationId, details, expiresAt, useTransaction } = props

  const db = useTransaction ? ctx.knex : ctx.db.root

  return db('app_private.integration_secrets')
    .insert({ integration_id: integrationId, details, expires_at: expiresAt })
    .onConflict('integration_id')
    .merge()
    .returning('*')
}
