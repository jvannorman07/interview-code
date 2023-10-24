// Context provider not included in this sample
// @ts-ignore
import { Context } from '../..'

type Props = {
  integrationId: string
  useTransaction?: boolean
}

export default async function getIntegration(props: Props, ctx: Context): Promise<any> {
  const { integrationId, useTransaction = true } = props
  const { knex } = ctx

  const db = useTransaction ? knex : ctx.db.root

  const integrations = await db('app_public.integrations AS i')
    .select('i.*', 'is.details AS secrets', 'c.organization_id', 'c.name as company_name')
    .leftJoin('app_private.integration_secrets AS is', 'is.integration_id', 'i.id')
    .leftJoin('app_public.companies AS c', 'c.id', 'i.company_id')
    .where('i.id', integrationId)

  return integrations[0]
}
