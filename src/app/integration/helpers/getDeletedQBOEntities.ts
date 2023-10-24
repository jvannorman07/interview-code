import { toISO } from '../../../utils/date'
import { IntuitQueryResponse } from '../types'

type Props = {
  client: any
  endpoint: string
  maxPlatformUpdatedAt?: Date | null
  fetchAll?: boolean
  onPage?: (rows: any[]) => any
}

export default async function getDeletedQBOEntities(
  props: Props,
): Promise<IntuitQueryResponse<string>> {
  const { client, endpoint, maxPlatformUpdatedAt, fetchAll, onPage } = props

  let qs = `Active = false`

  if (maxPlatformUpdatedAt && !fetchAll) {
    qs = qs.concat(` AND MetaData.LastUpdatedTime > '${toISO(maxPlatformUpdatedAt)}'`)
  }

  return client.select({ columns: '*', entityName: endpoint, condition: qs, onPage })
}
