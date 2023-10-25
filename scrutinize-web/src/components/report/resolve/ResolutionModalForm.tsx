import React from 'react'
import { useFormikContext, Form } from 'formik'
import { isNil } from 'lodash'
import { Button, Modal, FlexColumn, FlexRow, Text, Icon, Anchor } from 'elements'
import ModalContent from 'components/app/ModalContent'
import { getResolutionBehavior, getResolutionError } from '../utils/resolutions/general'
import AnomaliesInfo from './AnomaliesInfo'
import TransactionInfo from './TransactionInfo'
import { toTitleCase } from '../../../utils/string'
import ErrorBanner from '../../common/ErrorBanner'
import ModalTransactionLineTables from './ModalTransactionLineTables'
import { Transaction } from '../types'
import TransactionTotalAmount from './TransactionTotalAmount'
import { transferTransactionTypes } from './constants'
import TransactionTaxRate from './TransactionTaxRate'
import config from 'config'
import { getTransactionTypeRoute } from '../utils/formatting'

type Props = {
  resolution: any
  items: any[]
  accounts: any[]
  customers: any[]
  vendors: any[]
  modal: any
  reportId: string
  anomalyView?: string
}

export default function ResolutionModalForm(props: Props) {
  const { resolution, items, accounts, customers, vendors, modal, reportId, anomalyView } = props

  const { resolutionKind, status, updateStatus, anomalyTypes } = resolution
  const formCtx = useFormikContext()
  const { isSubmitting, setFieldValue } = formCtx
  const initialValues = formCtx.initialValues as Transaction
  const values = formCtx.values as Transaction
  const { transactionNum, transactionType, transactionId } = initialValues

  const editing = formCtx.dirty

  const { label } = getResolutionBehavior(resolution.status, editing)

  const displayType = toTitleCase(transactionType)
  const displayNum = transactionNum ? `#${transactionNum}` : ''

  const errorMessage = getResolutionError(resolution)

  const canEdit = resolutionKind === 'resolve' && resolution.status === 'forReview'
  const canEditAmount = canEdit && transferTransactionTypes.includes(transactionType)

  const handleClose = () => {
    if (!editing || window.confirm('You have unsaved changes. Close anyway?')) {
      modal.onClose()

      return true
    }

    return false
  }

  const transactionTypeRoute = getTransactionTypeRoute(transactionType)

  return (
    <>
      <ModalContent bg="background.1" height="100%" px="gigantic">
        <FlexRow justifyContent="flex-end" pb="xxlarge">
          <Button kind="transparent" area="xxsmall" onClick={handleClose}>
            <Icon name="x" color="neutral.1" size="medium" />
          </Button>
        </FlexRow>
        <Form id="transactionResolution">
          <FlexRow justifyContent="space-between" mb="gigantic">
            <FlexRow alignItems="center">
              <Text fontSize="xgigantic" lineHeight="xgigantic" fontWeight="bold" mr="medium">
                {displayType} {displayNum}
              </Text>
              {transactionId && (
                <Anchor
                  color="foreground.0"
                  target="_blank"
                  href={`${config.services.intuit.host}/${transactionTypeRoute}?txnId=${transactionId}`}
                >
                  <Icon name="arrow-top-right-square" size="large" />
                </Anchor>
              )}
            </FlexRow>
            <TransactionTotalAmount
              transactionAmount={values.transactionAmount}
              canEditAmount={canEditAmount}
            />
          </FlexRow>
          {status === 'forReview' && updateStatus === 'error' && (
            <FlexColumn mb="xlarge">
              <ErrorBanner
                styleProps={{ bg: 'danger.0', color: 'background.0' }}
                message={errorMessage}
              />
            </FlexColumn>
          )}
          <TransactionInfo
            transactionValues={values}
            onChange={setFieldValue}
            canEdit={canEdit}
            accounts={accounts}
            customers={customers}
            vendors={vendors}
            styleProps={{ mb: 'xxlarge' }}
          />
          <ModalTransactionLineTables
            items={items}
            accounts={accounts}
            customers={customers}
            vendors={vendors}
            canEdit={canEdit}
            anomalyTypes={anomalyTypes}
            styleProps={{ boxProps: { mb: 'xxxlarge' } }}
          />
          {!isNil(values.transactionTotalTaxRate) && (
            <FlexRow justifyContent="flex-end" mb="xxxlarge">
              <TransactionTaxRate />
            </FlexRow>
          )}
          <AnomaliesInfo
            anomalyTypes={anomalyTypes}
            reportId={reportId}
            resolution={resolution}
            onClose={handleClose}
            anomalyView={anomalyView}
          />
        </Form>
      </ModalContent>
      {/* @ts-ignore */}
      <Modal.Footer display="flex" alignItems="center" justifyContent="flex-end" modal={modal}>
        <Button kind="alt-neutral-2" onClick={handleClose} mr="xlarge">
          Close
        </Button>
        <Button
          mr="75px"
          kind="primary"
          disabled={isSubmitting}
          type="submit"
          form="transactionResolution"
        >
          {!isSubmitting ? label : 'Saving...'}
        </Button>
        {/* @ts-ignore */}
      </Modal.Footer>
    </>
  )
}
