import { cloneDeep } from 'lodash'
import { mapToDestination, deepUpdateValue } from './mapToDestination'
import { transactionUpdateMap } from '../app/formats/converters/quickbooks/api/maps/transactions'

describe('mapToDestination utils', () => {
  describe('deepUpdateValue', () => {
    test('updates and returns true', () => {
      const obj = { a: { b: { foo: 0 } } }
      const res = deepUpdateValue(obj, 'a.b.foo', 100)

      expect(res).toBe(true)
      expect(obj.a.b.foo).toBe(100)
    })

    test('returns false for unfound value', () => {
      const obj = { a: { b: { foo: 0 } } }
      const res = deepUpdateValue(obj, 'a.b.bar', 100)

      expect(res).toBe(false)
      expect(obj).toStrictEqual({ a: { b: { foo: 0 } } })
    })

    test('object copy', () => {
      const obj = { a: { b: { foo: 0 } } }
      const copy = cloneDeep(obj)
      const res = deepUpdateValue(copy, 'a.b.foo', 100)

      expect(res).toBe(true)
      expect(copy.a.b.foo).toBe(100)
      expect(obj.a.b.foo).toBe(0)
    })
  })

  describe('mapToDestination', () => {
    test('maps to destination object', () => {
      const source = { a: 1, b: 2 }
      const destination = { foo: 5, bar: 10, test: 'value' }
      const map = { a: 'foo', b: 'bar' }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: 1, bar: 2, test: 'value' }

      expect(res).toStrictEqual(expected)
    })

    test('nested dest values', () => {
      const source = { a: 1, b: 2 }
      const destination = { foo: { test: 25 }, bar: 10, test: 'value' }
      const map = { a: 'foo.test' }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: { test: 1 }, bar: 10, test: 'value' }

      expect(res).toStrictEqual(expected)
    })

    test('array of key accessors', () => {
      const source = { a: 1, b: 2 }
      const destination = { foo: { test: 25 }, bar: 10, test: 'value' }
      const map = { a: ['wrong', 'foo.test'] }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: { test: 1 }, bar: 10, test: 'value' }

      expect(res).toStrictEqual(expected)
    })

    test('key not found in destination', () => {
      const source = { a: 1, b: 2 }
      const destination = { foo: { test: 25 }, bar: 10, test: 'value' }
      const map = { a: ['wrong', 'also wrong'] }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: { test: 25 }, bar: 10, test: 'value' }

      expect(res).toStrictEqual(expected)
    })

    test('does not update original object', () => {
      const source = { a: 1, b: 2 }
      const destination = { foo: { test: 25 }, bar: 10, test: 'value' }
      const map = { a: ['wrong', 'foo.test'] }

      const res = mapToDestination({ source, destination, map })

      expect(res.foo.test).toBe(1)
      expect(destination.foo.test).toBe(25)
    })

    test('does nothing if key not present in source', () => {
      const source = { a: 1 }
      const destination = { foo: 'bar' }
      const map = { b: 'foo' }

      const res = mapToDestination({ source, destination, map })

      expect(res).toStrictEqual(destination)
    })

    test('does not update values that are null in source', () => {
      const source = { a: 1, b: null }
      const destination = { foo: 'bar', test: 'value' }
      const map = { a: 'foo', b: 'test' }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: 1, test: 'value' }

      expect(res).toStrictEqual(expected)
    })

    test('update to null for nullable source values', () => {
      const source = { a: 1, b: null }
      const destination = { foo: 'bar', test: 'value' }
      const map = { a: 'foo', b: { path: 'test', nullable: true } }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: 1, test: null }

      expect(res).toStrictEqual(expected)
    })

    test('array', () => {
      const source = {
        lines: [
          { id: '1', foo: 'bar' },
          { id: '2', foo: 'value' },
        ],
      }

      const destination = {
        foo: 'bar',
        Line: [
          { lineId: '1', a: 1, b: 2 },
          { lineId: '2', a: 3, b: 4 },
        ],
      }

      const map = {
        lines: {
          arrayAccessor: 'Line',
          arrayMatcher: ['id', 'lineId'],
          arrayMap: { foo: 'b' },
        },
      }

      const res = mapToDestination({ source, destination, map })

      const expected = {
        foo: 'bar',
        Line: [
          { lineId: '1', a: 1, b: 'bar' },
          { lineId: '2', a: 3, b: 'value' },
        ],
      }

      expect(res).toStrictEqual(expected)
    })

    test('array map only updates found objects', () => {
      const source = {
        lines: [
          { id: '1', foo: 'bar' },
          { id: '2', foo: 'value' },
        ],
      }

      const destination = {
        foo: 'bar',
        Line: [
          { lineId: '1', a: 1, b: 2 },
          { lineId: '3', a: 3, b: 4 },
        ],
      }

      const map = {
        lines: {
          arrayAccessor: 'Line',
          arrayMatcher: ['id', 'lineId'],
          arrayMap: { foo: 'b' },
        },
      }

      const res = mapToDestination({ source, destination, map })

      const expected = {
        foo: 'bar',
        Line: [
          { lineId: '1', a: 1, b: 'bar' },
          { lineId: '3', a: 3, b: 4 },
        ],
      }

      expect(res).toStrictEqual(expected)
    })

    test('array map does not update when source value is null', () => {
      const source = {
        lines: [
          { id: '1', foo: 'bar' },
          { id: '2', foo: null },
        ],
      }

      const destination = {
        foo: 'bar',
        Line: [
          { lineId: '1', a: 1, b: 2 },
          { lineId: '2', a: 3, b: 4 },
        ],
      }

      const map = {
        lines: {
          arrayAccessor: 'Line',
          arrayMatcher: ['id', 'lineId'],
          arrayMap: { foo: 'b' },
        },
      }

      const res = mapToDestination({ source, destination, map })

      const expected = {
        foo: 'bar',
        Line: [
          { lineId: '1', a: 1, b: 'bar' },
          { lineId: '2', a: 3, b: 4 },
        ],
      }

      expect(res).toStrictEqual(expected)
    })

    test('shouldSet', () => {
      const source = { a: 1, b: 2 }
      const destination = { foo: 'bar', test: 'value' }
      const map = { a: 'foo', b: { path: 'newKey', shouldSet: true } }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: 1, test: 'value', newKey: 2 }

      expect(res).toStrictEqual(expected)
    })

    test('deleteDestinationPaths', () => {
      const source = { a: 1, b: 2 }
      const destination = { foo: 'bar', test: 'value', nested: { structure: 'foo', test: 'bar' } }
      const map = {
        a: 'foo',
        b: { path: 'test', deleteDestinationPaths: ['foo', 'nested.structure'] },
      }

      const res = mapToDestination({ source, destination, map })
      const expected = { test: 2, nested: { test: 'bar' } }

      expect(res).toStrictEqual(expected)
    })

    test('no delete if null source value', () => {
      const source = { a: 1, b: null }
      const destination = { foo: 'bar', test: 'value', nested: { structure: 'foo', test: 'bar' } }
      const map = {
        a: 'foo',
        b: { path: 'test', deleteDestinationPaths: ['foo', 'nested.structure'] },
      }

      const res = mapToDestination({ source, destination, map })
      const expected = { ...destination, foo: 1 }

      expect(res).toStrictEqual(expected)
    })

    test('nullable', () => {
      const source = { a: 1, b: null }
      const destination = { foo: 'bar', nested: { structure: 'foo', test: 'bar' } }
      const map = {
        a: 'foo',
        b: { path: 'nested.structure', nullable: true },
      }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: 1, nested: { structure: null, test: 'bar' } }

      expect(res).toStrictEqual(expected)
    })

    test('no set for nullable if key not present in source', () => {
      const source = { a: 1 }
      const destination = { foo: 'bar', nested: { structure: 'foo', test: 'bar' } }
      const map = {
        a: 'foo',
        b: { path: 'nested.structure', shouldSet: true, nullable: true },
      }

      const res = mapToDestination({ source, destination, map })
      const expected = { foo: 1, nested: { structure: 'foo', test: 'bar' } }

      expect(res).toStrictEqual(expected)
    })

    describe('array of accessor objects', () => {
      test('options in array', () => {
        const source = { a: 1, b: 2 }
        const destination = { foo: 'bar', nested: { structure: 'foo', test: 'bar' } }
        const map = {
          a: 'foo',
          b: ['absent path', { path: 'nested.absentPath', shouldSet: true }],
        }

        const res = mapToDestination({ source, destination, map })
        const expected = { foo: 1, nested: { structure: 'foo', test: 'bar', absentPath: 2 } }

        expect(res).toStrictEqual(expected)
      })

      test('breaks on update', () => {
        const source = { a: 1, b: 2 }
        const destination = {
          foo: 'bar',
          bar: 'lorem',
          nested: { structure: 'foo', test: 'bar' },
        }
        const map = {
          a: 'foo',
          b: ['bar', { path: 'nested.absentPath', shouldSet: true }],
        }

        const res = mapToDestination({ source, destination, map })
        // breaks before reaching shouldSet accessor
        const expected = { foo: 1, bar: 2, nested: { structure: 'foo', test: 'bar' } }

        expect(res).toStrictEqual(expected)
      })
    })

    describe('accessor function', () => {
      test('use accessor function', () => {
        const source = { a: 1, b: 2 }
        const destination = { foo: 'bar', nested: { structure: 'foo', test: 'bar' } }
        const map = {
          a: 'foo',
          b: (source) => ({ path: 'nested.newKey', shouldSet: source.a === 1 }),
        }

        const res = mapToDestination({ source, destination, map })
        const expected = { foo: 1, nested: { structure: 'foo', test: 'bar', newKey: 2 } }

        expect(res).toStrictEqual(expected)
      })

      test('error in accessor function', () => {
        const source = { a: 1, b: 2 }
        const destination = { foo: 'bar', nested: { structure: 'foo', test: 'bar' } }
        const map = {
          a: 'foo',
          b: () => {
            throw new Error('test error')
          },
        }

        const res = mapToDestination({ source, destination, map })
        const expected = { foo: 1, nested: { structure: 'foo', test: 'bar' } }

        expect(res).toStrictEqual(expected)
      })

      test('parentObj in accessor function', () => {
        const source = { a: 1, b: 2 }
        const destination = { foo: 'bar', nested: { structure: 'foo', test: 'bar' } }
        const parentObj = { foo: 'test' }
        const map = {
          a: 'foo',
          b: (src, parentObj) => {
            if (parentObj.foo === 'test') {
              return { path: 'nested.key', shouldSet: true }
            }

            return null
          },
        }

        const res = mapToDestination({ source, destination, map, parentObj })
        const expected = { foo: 1, nested: { structure: 'foo', test: 'bar', key: 2 } }

        expect(res).toStrictEqual(expected)
      })

      test('array map uses parent object', () => {
        const source = {
          test: 'value',
          lines: [
            { id: '1', foo: 'bar' },
            { id: '2', foo: 'value' },
          ],
        }

        const destination = {
          foo: 'bar',
          Line: [
            { lineId: '1', a: 1, b: 2 },
            { lineId: '2', a: 3, b: 4 },
          ],
        }

        const map = {
          lines: {
            arrayAccessor: 'Line',
            arrayMatcher: ['id', 'lineId'],
            arrayMap: {
              foo: (src, parentObj) => {
                if (parentObj.test === 'value') {
                  return 'b'
                }

                return null
              },
            },
          },
        }

        const res = mapToDestination({ source, destination, map })

        const expected = {
          foo: 'bar',
          Line: [
            { lineId: '1', a: 1, b: 'bar' },
            { lineId: '2', a: 3, b: 'value' },
          ],
        }

        expect(res).toStrictEqual(expected)
      })
    })

    describe('global shouldSet', () => {
      test('populates blank object', () => {
        const source = { a: 1, b: 2, c: null }
        const map = {
          a: 'foo',
          b: 'bar.test.foo',
          c: { path: 'bar.test.bar', nullable: true },
        }

        const res = mapToDestination({ source, map, options: { shouldSet: true } })

        const expected = {
          foo: 1,
          bar: {
            test: {
              foo: 2,
              bar: null,
            },
          },
        }

        expect(res).toStrictEqual(expected)
      })

      test('arrays in source', () => {
        const source = {
          a: [
            { foo: 1, bar: 2 },
            { foo: 2, bar: 2 },
          ],
        }

        const map = {
          a: {
            arrayAccessor: 'test.foo',
            arrayMap: {
              foo: 'a',
              bar: 'b',
            },
            shouldSet: true,
          },
        }

        const res = mapToDestination({ source, map, options: { shouldSet: true } })

        const expected = {
          test: {
            foo: [
              { a: 1, b: 2 },
              { a: 2, b: 2 },
            ],
          },
        }

        expect(res).toStrictEqual(expected)
      })
    })

    describe('array shouldSet', () => {
      test('add objects to array', () => {
        const source = {
          lines: [
            { lineId: '1', foo: 'bar' },
            { lineId: '2', foo: 'test' },
          ],
          addedLines: [
            { lineId: '3', foo: 1 },
            { lineId: '4', foo: 2 },
          ],
        }

        const destination = {
          a: {
            destLines: [
              { lineId: '1', a: 1, b: 2 },
              { lineId: '2', a: 3, b: 4 },
            ],
          },
        }

        const arrayMap = {
          lineId: 'lineId',
          foo: 'a',
        }

        const map = {
          lines: { arrayAccessor: 'a.destLines', arrayMap, arrayMatcher: ['lineId', 'lineId'] },
          addedLines: { arrayAccessor: 'a.destLines', arrayMap, shouldSet: true },
        }

        const res = mapToDestination({ source, destination, map })

        const expected = {
          a: {
            destLines: [
              { lineId: '1', a: 'bar', b: 2 },
              { lineId: '2', a: 'test', b: 4 },
              { lineId: '3', a: 1 },
              { lineId: '4', a: 2 },
            ],
          },
        }

        expect(res).toStrictEqual(expected)
      })
    })

    describe('array shouldDelete', () => {
      test('deletes objects from array', () => {
        const source = {
          lines: [
            { lineId: '1', foo: 'bar' },
            { lineId: '2', foo: 'test' },
          ],
          deleteLines: [
            { lineId: '3', foo: 1 },
            { lineId: '4', foo: 2 },
          ],
        }

        const destination = {
          a: {
            destLines: [
              { Id: '1', a: 1, b: 2 },
              { Id: '2', a: 3, b: 4 },
              { Id: '3', a: 5, b: 6 },
              { Id: '4', a: 7, b: 8 },
            ],
          },
        }

        const arrayMap = {
          lineId: 'lineId',
          foo: 'a',
        }

        const arrayMatcher = ['lineId', 'Id']

        const map = {
          lines: { arrayAccessor: 'a.destLines', arrayMap, arrayMatcher },
          deleteLines: { arrayAccessor: 'a.destLines', arrayMatcher, shouldDelete: true },
        }

        const res = mapToDestination({ source, destination, map })

        const expected = {
          a: {
            destLines: [
              { Id: '1', a: 'bar', b: 2 },
              { Id: '2', a: 'test', b: 4 },
            ],
          },
        }

        expect(res).toStrictEqual(expected)
      })
    })

    describe('QBO transaction data', () => {
      const formattedData = {
        transactionId: '108',
        transactionType: 'bill',
        transactionEndpoint: 'Bill',
        transactionEntityName: 'Robertson & Associates',
        transactionEntityId: '49',
        transactionEntityType: 'vendor',
        transactionAmount: 315,
        transactionNum: null,
        transactionAccount: null,
        transactionAccountId: null,
        transactionDate: '2021-01-15',
        transactionCreatedTime: '2021-01-15T12:36:59-08:00',
        transactionLastUpdatedTime: '2021-01-15T12:36:59-08:00',
        transactionLines: [
          {
            lineId: '1',
            lineNum: 1,
            lineAccount: 'Legal & Professional Fees:Accounting',
            lineAccountId: '69',
            lineRate: null,
            lineQuantity: null,
            lineItem: null,
            lineItemId: null,
            lineDebit: null,
            lineCredit: 315,
          },
        ],
      }

      const rawData = {
        Id: '108',
        Line: [
          {
            Id: '1',
            Amount: 315,
            LineNum: 1,
            DetailType: 'AccountBasedExpenseLineDetail',
            AccountBasedExpenseLineDetail: {
              AccountRef: {
                name: 'Legal & Professional Fees:Accounting',
                value: '69',
              },
              TaxCodeRef: { value: 'NON' },
              BillableStatus: 'NotBillable',
            },
          },
        ],
        domain: 'QBO',
        sparse: false,
        Balance: 315,
        DueDate: '2021-01-15',
        TxnDate: '2021-01-15',
        MetaData: {
          CreateTime: '2021-01-15T12:36:59-08:00',
          LastUpdatedTime: '2021-01-15T12:36:59-08:00',
        },
        TotalAmt: 315,
        SyncToken: '0',
        VendorRef: { name: 'Robertson & Associates', value: '49' },
        CurrencyRef: { name: 'United States Dollar', value: 'USD' },
        APAccountRef: { name: 'Accounts Payable (A/P)', value: '33' },
      }

      test('QBO transaction data, no edits', () => {
        const res = mapToDestination({
          source: formattedData,
          destination: rawData,
          map: transactionUpdateMap,
        })

        expect(res).toStrictEqual(rawData)
      })

      test('edit fields', () => {
        const editedData = {
          ...formattedData,
          transactionAmount: 999,
          transactionDate: '2022-07-01',
        }

        const res = mapToDestination({
          source: editedData,
          destination: rawData,
          map: transactionUpdateMap,
        })

        expect(res.TotalAmt).toBe(999)
        expect(res.TxnDate).toBe('2022-07-01')
      })
    })
  })
})
