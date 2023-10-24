import { pick } from 'lodash'
import { DateTime } from 'luxon'
// Context provider and invariant (error creation) not included in this sample
// @ts-ignore
import { Context, invariant, AppError } from '../../..'
import getIntegration from '../../helpers/getIntegration'
import updateIntegrationSecrets from '../../helpers/updateIntegrationSecrets'

type Props = {
  integrationId: string
}

export async function refreshIntuitIntegration(props: Props, ctx: Context): Promise<any> {
  const { knex } = ctx
  const { integrationId } = props

  const integration = await getIntegration({ integrationId }, ctx)
  invariant(integration, 'not-found', 'Integration not found', props)

  const { token } = integration.secrets
  invariant(token?.refresh_token, 'invalid-value', 'Refresh token missing', token)

  try {
    const client = ctx.integration.getIntuitClient()
    const response = await client.refreshUsingToken(token.refresh_token)
    const refreshedToken = response.getJson()

    // store the new token, but merge it with the existing values
    // b/c some of them only get sent with the initial authorization (like realmId)
    // and we don't want to lose them
    const details = {
      ...integration.secrets,
      token: {
        ...integration.secrets.token,
        ...pick(refreshedToken, ['refresh_token', 'x_refresh_token_expires_in']),
      },
    }

    const expiresAt = DateTime.utc()
      .plus({ seconds: refreshedToken.x_refresh_token_expires_in })
      .toISO()

    await updateIntegrationSecrets(
      { integrationId, details, expiresAt, useTransaction: false },
      ctx,
    )

    // add realm id to integration config
    if (!integration.config.intuit.realmId) {
      const realmId = details.token.realmId

      await knex('app_public.integrations')
        .update({ config: { ...integration.config, realmId } })
        .where({ id: integrationId })
    }

    // TODO: also update company info in case it's changed

    // return the entire token, including the realmId
    return { ...details.token, ...refreshedToken }
  } catch (error: any) {
    ctx.log.error({ integrationId }, 'Error refreshing QBO token')

    //throw error to fail the report and update the integration status
    throw new AppError('response-error', 'Intuit response error', error)
  }
}

export default refreshIntuitIntegration
