import { getQBOLinkedTxnRefs, getQBOMissingRefs, addLinkedTxnsFromList } from './linkedTransactions'

describe('linkedTxnUtils', () => {
  const transactions = [
    {
      endpoint: 'Deposit',
      transaction: {
        Id: '1',
        Line: [
          {
            LinkedTxn: [
              {
                TxnType: 'invoice',
                TxnId: 'linked1',
              },
            ],
          },
          {
            LinkedTxn: [
              {
                TxnType: 'invoice',
                TxnId: 'linked2',
              },
            ],
          },
        ],
      },
      linkedTransactions: [],
    },
    {
      endpoint: 'Invoice',
      transaction: {
        Id: 'linked1',
      },
      linkedTransactions: [],
    },
  ]

  const txnRefs = [
    {
      TxnId: 'linked1',
      TxnType: 'invoice',
      parentTxnId: '1',
    },
    {
      TxnId: 'linked2',
      TxnType: 'invoice',
      parentTxnId: '1',
    },
  ]

  describe('getQBOLinkedTxnRefs', () => {
    test('generates flat list of linked txn refs', () => {
      const res = getQBOLinkedTxnRefs({ transactions })

      const expected = [
        {
          TxnId: 'linked1',
          TxnType: 'invoice',
          parentTxnId: '1',
        },
        {
          TxnId: 'linked2',
          TxnType: 'invoice',
          parentTxnId: '1',
        },
      ]

      expect(res).toStrictEqual(expected)
    })
  })

  describe('getQBOMissingRefs', () => {
    const res = getQBOMissingRefs({ transactions, txnRefs })

    const expected = [txnRefs[1]]

    expect(res).toStrictEqual(expected)
  })

  describe('addLinkedTxnsFromList', () => {
    const res = addLinkedTxnsFromList({ transactions, linkedTxnRefs: txnRefs })

    const expected = [
      {
        endpoint: 'Deposit',
        transaction: {
          Id: '1',
          Line: [
            {
              LinkedTxn: [
                {
                  TxnType: 'invoice',
                  TxnId: 'linked1',
                },
              ],
            },
            {
              LinkedTxn: [
                {
                  TxnType: 'invoice',
                  TxnId: 'linked2',
                },
              ],
            },
          ],
        },
        linkedTransactions: [
          {
            Id: 'linked1',
          },
        ],
      },
      {
        endpoint: 'Invoice',
        transaction: {
          Id: 'linked1',
        },
        linkedTransactions: [],
      },
    ]

    expect(res).toStrictEqual(expected)
  })
})
