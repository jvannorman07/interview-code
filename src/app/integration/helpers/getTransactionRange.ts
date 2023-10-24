import { Context } from '../..'

type Props = {
  platform: string
  platformCompanyId: string
  organizationId: string
}

type Result = {
  minTransactionDate: string
  maxPlatformUpdatedAt: string
  maxUpdatedAt: string
}

export default async function getTransactionRange(props: Props, ctx: Context): Promise<Result> {
  const { knex } = ctx
  const { platform, platformCompanyId, organizationId } = props

  const result = await knex('app_public.integration_transactions')
    .min('transaction_date', { as: 'minTransactionDate' })
    .max('platform_updated_at', { as: 'maxPlatformUpdatedAt' })
    .max('updated_at', { as: 'maxUpdatedAt' })
    .where({ platform, platform_company_id: platformCompanyId, organization_id: organizationId })
    .first()

  return result as Result
}
