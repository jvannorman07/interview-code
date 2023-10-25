# scrutinize-web

Shareable React content.

## Report resolution modal

In the database, report resolutions maintain the state for staged and synced updates to Quickbooks transactions. [ResolutionModal](./src/components//report/resolve/ResolutionModal.tsx) and [ResolutionModalForm](./src/components/report/resolve/ResolutionModalForm.tsx) allow users to stage updates to Quickbooks transactions.

### Form validation

```ts
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
```

### Fetch list of items (products), accounts, customers, and vendors for the dropdown choices for the transaction.

```ts
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
```

### Form submission, which updates the database with the staged changes

```ts
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
```