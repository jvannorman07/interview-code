import React from 'react'
import { isEqual } from 'lodash'
import { Formik } from 'formik'
// @ts-ignore
import { number, array, object } from 'yup'
import { useLazyLoadQuery, graphql } from 'react-relay/hooks'
import { getResolutionBehavior } from '../utils/resolutions/general'
import { useAuth, useAnalytics, useNotifications } from 'hooks'
import useReportResolutionUndo from './hooks/useReportResolutionUndo'
import useReportResolutionUpdate from './hooks/useReportResolutionUpdate'
import useReportResolutionUpdateStatus from './hooks/useReportResolutionUpdateStatus'
import ResolutionModalForm from './ResolutionModalForm'
import { createFormValidator } from 'utils/validation'
import { ReportResolution } from '../types'

const validate = createFormValidator({
  transactionAmount: number().nullable(true),
  transactionLines: array().of(
    object().shape({
      lineQuantity: number().min(0).nullable(true),
      lineRate: number().min(0).nullable(true),
      lineAmount: number().nullable(true),
      lineDebit: number().nullable(true),
      lineCredit: number().nullable(true),
    }),
  ),
})

type Props = {
  modal: any
  resolutionId: string
  platformCompanyId: string
  reportId: string
  anomalyView: string
}

export default function ResolutionModal(props: Props) {
  const { modal, resolutionId, platformCompanyId, reportId, anomalyView } = props

  const { currentOrg } = useAuth()
  const [undoResolution]: any = useReportResolutionUndo()
  const [updateResolution]: any = useReportResolutionUpdate()
  const [updateResolutionStatus]: any = useReportResolutionUpdateStatus()
  const analytics = useAnalytics()
  const notifications = useNotifications()

  const data = useLazyLoadQuery<any>(
    graphql`
      query ResolutionModalQuery($slug: String!, $platformCompanyId: String, $resolutionId: ID!) {
        organizationBySlug(slug: $slug) {
          integrationItems(condition: { platformCompanyId: $platformCompanyId }) {
            nodes {
              data
            }
          }
          integrationAccounts(condition: { platformCompanyId: $platformCompanyId }) {
            nodes {
              data
            }
          }
          integrationCustomers(condition: { platformCompanyId: $platformCompanyId }) {
            nodes {
              data
            }
          }
          integrationVendors(condition: { platformCompanyId: $platformCompanyId }) {
            nodes {
              data
            }
          }
        }
        reportResolutionById(id: $resolutionId) {
          id
          currentValue
          initialValue
          resolutionKind
          status
          updateStatus
          anomalyTypes
          responseData
        }
      }
    `,
    { slug: currentOrg!.slug, reportId, platformCompanyId, resolutionId },
  )

  const resolution = data?.reportResolutionById as ReportResolution | undefined

  if (!resolution) {
    return null
  }

  const { currentValue, initialValue } = resolution
  const { transactionData } = currentValue

  const items =
    data?.organizationBySlug?.integrationItems?.nodes?.map(({ data }: any) => data) || []

  const accounts =
    data?.organizationBySlug?.integrationAccounts?.nodes?.map(({ data }: any) => data) || []

  const customers =
    data?.organizationBySlug?.integrationCustomers?.nodes?.map(({ data }: any) => data) || []

  const vendors =
    data?.organizationBySlug?.integrationVendors?.nodes?.map(({ data }: any) => data) || []

  const handleSubmit = async (values: any, { setSubmitting, setFieldError, resetForm }: any) => {
    try {
      // transactionData is initial values
      const editing = !isEqual(values, transactionData)
      const { action } = getResolutionBehavior(resolution.status, editing)

      switch (action) {
        case 'review':
          await updateResolutionStatus(
            { resolutionId, status: 'reviewed' },
            {
              resolutionSection: 'forReview',
              anomalies: anomalyView === 'all' ? null : [anomalyView],
            },
          )

          analytics.track('Resolution Reviewed', {
            resolutionId,
            platformTransactionId: transactionData.transactionId,
            transactionType: transactionData.transactionType,
            endpoint: transactionData.transactionEndpoint,
          })

          break

        case 'undoReview':
          await updateResolutionStatus(
            { resolutionId, status: 'forReview' },
            {
              resolutionSection: 'reviewed',
              anomalies: anomalyView === 'all' ? null : [anomalyView],
            },
          )

          analytics.track('Resolution Review Undone', {
            resolutionId,
            platformTransactionId: transactionData.transactionId,
            transactionType: transactionData.transactionType,
            endpoint: transactionData.transactionEndpoint,
          })

          break

        case 'resolve':
          await updateResolution(
            {
              resolutionId,
              values: {
                status: 'resolved',
                updateStatus: 'pending',
                currentValue: {
                  ...currentValue,
                  transactionData: values,
                },
              },
            },
            {
              resolutionSection: 'forReview',
              anomalies: anomalyView === 'all' ? null : [anomalyView],
            },
          )

          analytics.track('Resolution Staged', {
            resolutionId,
            platformTransactionId: transactionData.transactionId,
            transactionType: transactionData.transactionType,
            endpoint: transactionData.transactionEndpoint,
          })

          // when the transaction data has been updated, we need to reset the initial values
          // of the form to the current (edited) values
          resetForm({ values })

          break

        case 'undoResolve':
          await undoResolution(
            { resolutionId: resolutionId },
            {
              resolutionSection: 'resolved',
              anomalies: anomalyView === 'all' ? null : [anomalyView],
            },
          )

          analytics.track('Resolution Undone', {
            resolutionId,
            platformTransactionId: transactionData.transactionId,
            transactionType: transactionData.transactionType,
            endpoint: transactionData.transactionEndpoint,
          })

          // reset form to original transaction initial values
          resetForm({ values: initialValue.transactionData })

          break

        default:
          break
      }

      notifications.info('Transaction saved.', { position: 'bottom-left' })
    } catch (e) {
      setFieldError('general', 'Error updating transaction')
      setSubmitting(false)
    }
  }

  return (
    <Formik initialValues={transactionData} onSubmit={handleSubmit} validate={validate}>
      <ResolutionModalForm
        resolution={resolution}
        accounts={accounts}
        customers={customers}
        vendors={vendors}
        items={items}
        modal={modal}
        reportId={reportId}
        anomalyView={anomalyView}
      />
    </Formik>
  )
}
