import { useState, useEffect, useRef } from "react"
import { useMutation } from "@apollo/client"

import MUTATION_LN_INVOICE_CREATE from "store/graphql/mutation.ln-invoice-create"
import MUTATION_LN_NO_AMOUNT_INVOICE_CREATE from "store/graphql/mutation.ln-no-amount-invoice-create"
import Spinner from "./spinner"
import { usdFormatter } from "store"
import { translate } from "translate"

import Invoice from "./invoice"

const INVOICE_EXPIRE_INTERVAL = 60 * 60 * 1000

type InvoiceProps = {
  btcWalletId: string
  regenerate: () => void
  amount: number | ""
  currency: string
  memo: string
  satAmount: number
  convertedUsdAmount: number
}

const ErrorMessage = () => (
  <div className="error">
    {translate("Not able to generate invoice.")}
    <br />
    {translate("Please try again later.")}
  </div>
)

const ExpiredMessage = ({ onClick }: { onClick: () => void }) => (
  <div className="invoice-message expired-invoice">
    {translate("Invoice Expired...")}{" "}
    <div className="link" onClick={onClick}>
      {translate("Generate New Invoice")}
    </div>
  </div>
)

const AmountInvoiceGenerator = ({
  btcWalletId,
  regenerate,
  amount,
  memo,
  currency,
  satAmount,
  convertedUsdAmount,
}: InvoiceProps) => {
  const [invoiceStatus, setInvoiceStatus] = useState<undefined | "new" | "expired">()

  const timerIds = useRef<number[]>([])

  const [createInvoice, { loading, error, data }] = useMutation<{
    lnInvoiceCreate: GraphQL.LnInvoicePayload
  }>(MUTATION_LN_INVOICE_CREATE, {
    onError: console.error,
    onCompleted: () => setInvoiceStatus("new"),
  })

  const clearTimers = () => {
    timerIds.current.forEach((timerId) => clearTimeout(timerId))
  }

  useEffect(() => {
    createInvoice({
      variables: { input: { walletId: btcWalletId, amount: satAmount, memo } },
    })
    timerIds.current.push(
      window.setTimeout(() => setInvoiceStatus("expired"), INVOICE_EXPIRE_INTERVAL),
    )
    return clearTimers
  }, [satAmount, btcWalletId, createInvoice, currency, memo])

  let errorString: string | null = error?.message || null
  let invoice: GraphQL.Maybe<GraphQL.LnInvoice> | undefined = undefined

  if (data) {
    const invoiceData = data.lnInvoiceCreate
    if (invoiceData.errors?.length > 0) {
      errorString = invoiceData.errors.map((err) => err.message).join(", ")
    } else {
      invoice = invoiceData.invoice
    }
  }

  if (errorString) {
    return <ErrorMessage />
  }

  if (loading) {
    return <Spinner size="big" />
  }

  if (!invoice) {
    return null
  }

  if (invoiceStatus === "expired") {
    return <ExpiredMessage onClick={regenerate} />
  }

  const invoiceNeedUpdate = Boolean(
    currency === "USD" && amount && Math.abs(convertedUsdAmount - amount) / amount > 0.01,
  )

  return (
    <>
      {invoiceNeedUpdate && (
        <div className="invoice-message">
          {translate("Invoice value is now %{value}", {
            value: usdFormatter.format(convertedUsdAmount),
          })}
          <div className="link" onClick={regenerate}>
            {translate("Generate new invoice for %{amount}", {
              amount: usdFormatter.format(amount as number),
            })}
          </div>
        </div>
      )}
      <Invoice invoice={invoice} onPaymentSuccess={clearTimers} />
    </>
  )
}

type NoInvoiceProps = {
  btcWalletId: string
  regenerate: () => void
  memo: string
}

const NoAmountInvoiceGenerator = ({ btcWalletId, regenerate, memo }: NoInvoiceProps) => {
  const [invoiceStatus, setInvoiceStatus] = useState<undefined | "new" | "expired">()

  const timerIds = useRef<number[]>([])

  const [createInvoice, { loading, error, data }] = useMutation<{
    lnNoAmountInvoiceCreate: GraphQL.LnNoAmountInvoicePayload
  }>(MUTATION_LN_NO_AMOUNT_INVOICE_CREATE, {
    onError: console.error,
    onCompleted: () => setInvoiceStatus("new"),
  })

  const clearTimers = () => {
    timerIds.current.forEach((timerId) => clearTimeout(timerId))
  }

  useEffect(() => {
    createInvoice({
      variables: { input: { walletId: btcWalletId, memo } },
    })
    timerIds.current.push(
      window.setTimeout(() => setInvoiceStatus("expired"), INVOICE_EXPIRE_INTERVAL),
    )
    return clearTimers
  }, [btcWalletId, createInvoice, memo])

  let errorString: string | null = error?.message || null
  let invoice: GraphQL.Maybe<GraphQL.LnNoAmountInvoice> | undefined = undefined

  if (data) {
    const invoiceData = data.lnNoAmountInvoiceCreate
    if (invoiceData.errors?.length > 0) {
      errorString = invoiceData.errors.map((err) => err.message).join(", ")
    } else {
      invoice = invoiceData.invoice
    }
  }

  if (errorString) {
    console.error(errorString)
    return <ErrorMessage />
  }

  if (loading) {
    return <Spinner size="big" />
  }

  if (!invoice) {
    return null
  }

  if (invoiceStatus === "expired") {
    return <ExpiredMessage onClick={regenerate} />
  }

  return <Invoice invoice={invoice} onPaymentSuccess={clearTimers} />
}

const InvoiceGenerator = (props: InvoiceProps) => {
  if (props.satAmount === 0) {
    return (
      <NoAmountInvoiceGenerator
        btcWalletId={props.btcWalletId}
        regenerate={props.regenerate}
        memo={props.memo}
      />
    )
  }

  return <AmountInvoiceGenerator {...props} />
}

export default InvoiceGenerator
