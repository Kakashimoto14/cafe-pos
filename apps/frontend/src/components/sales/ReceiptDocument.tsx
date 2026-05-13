import { BrandLogo } from "@/components/branding/BrandLogo";
import type { CafeSettings, OrderListItem } from "@cafe/shared-types";
import { formatOrderChannelLabel, getBrandLogoUrl, mergeCafeSettings } from "@/lib/cafe-settings";

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(value);
  }
}

type ReceiptDocumentProps = {
  order: OrderListItem;
  settings?: CafeSettings;
};

export function ReceiptDocument({ order, settings }: ReceiptDocumentProps) {
  const receiptSettings = mergeCafeSettings(order.receiptSettings ?? settings);

  return (
    <article className="mx-auto w-full max-w-[360px] rounded-[28px] border border-[#eadbcb] bg-white p-6 text-[#241610] shadow-[0_24px_60px_rgba(74,43,24,0.08)] print:max-w-[300px] print:rounded-none print:border-none print:p-0 print:shadow-none">
      {receiptSettings.showLogo ? (
        <div className="flex justify-center">
          <BrandLogo src={getBrandLogoUrl(receiptSettings)} alt={`${receiptSettings.storeName} logo`} className="h-16" />
        </div>
      ) : null}

      <div className="mt-4 text-center">
        <div className="text-lg font-semibold">{receiptSettings.receiptHeader}</div>
        <div className="mt-1 text-sm text-[#7b685c]">{receiptSettings.storeName}</div>
        <div className="text-sm text-[#7b685c]">{receiptSettings.branchName}</div>
        <div className="mt-1 text-xs text-[#7b685c]">{receiptSettings.address}</div>
        <div className="text-xs text-[#7b685c]">
          {[receiptSettings.contactNumber, receiptSettings.email].filter(Boolean).join(" / ")}
        </div>
      </div>

      <div className="mt-5 border-y border-dashed border-[#d9c2ac] py-4 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f7767]">Printed receipt</div>
        {receiptSettings.showQueueNumber && order.queueNumber ? (
          <div className="mt-2 text-2xl font-semibold tracking-[0.08em] text-[#7a4a2e]">Queue No: {order.queueNumber}</div>
        ) : null}
        {receiptSettings.showOrderNumber ? <div className="mt-2 text-lg font-semibold">{order.orderNumber}</div> : null}
        <div className="mt-1 text-sm text-[#7b685c]">{new Date(order.createdAt).toLocaleString("en-PH")}</div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {receiptSettings.showCashierName ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#7b685c]">Cashier</span>
            <span className="font-medium">{order.cashierName}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#7b685c]">Order type</span>
          <span className="font-medium">{formatOrderChannelLabel(order.orderType)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#7b685c]">Payment</span>
          <span className="font-medium uppercase">{order.paymentMethod}</span>
        </div>
        {order.paymentReference ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#7b685c]">Reference</span>
            <span className="font-medium">{order.paymentReference}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-t border-dashed border-[#d9c2ac] pt-4">
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
              <div>
                <div className="font-medium">{item.productName}</div>
                <div className="text-[#7b685c]">
                  {item.quantity} x {formatMoney(item.unitPrice, receiptSettings.currency)}
                </div>
                {item.addons && item.addons.length > 0 ? (
                  <div className="mt-1 space-y-0.5 text-[#7b685c]">
                    {item.addons.map((addon) => (
                      <div key={addon.id}>
                        + {addon.addonName}
                        {addon.quantity > 1 ? ` x${addon.quantity}` : ""} / {formatMoney(addon.priceDelta * addon.quantity, receiptSettings.currency)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="font-medium">{formatMoney(item.lineTotal, receiptSettings.currency)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-dashed border-[#d9c2ac] pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">Subtotal</span>
          <span>{formatMoney(order.subtotal, receiptSettings.currency)}</span>
        </div>
        {order.discountTotal > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-[#7b685c]">
              Discount
              {order.discountLabel ? ` (${order.discountLabel})` : ""}
            </span>
            <span>-{formatMoney(order.discountTotal, receiptSettings.currency)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">{receiptSettings.taxLabel}</span>
          <span>{formatMoney(order.taxTotal, receiptSettings.currency)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.grandTotal, receiptSettings.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">Amount paid</span>
          <span>{formatMoney(order.amountPaid, receiptSettings.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">Change</span>
          <span>{formatMoney(order.changeDue, receiptSettings.currency)}</span>
        </div>
      </div>

      {order.notes || order.paymentNotes ? (
        <div className="mt-5 border-t border-dashed border-[#d9c2ac] pt-4 text-sm text-[#7b685c]">
          {order.notes ? <p>Order note: {order.notes}</p> : null}
          {order.paymentNotes ? <p className={order.notes ? "mt-2" : undefined}>Payment note: {order.paymentNotes}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 border-t border-dashed border-[#d9c2ac] pt-4 text-center text-xs text-[#8f7767]">
        <div className="uppercase tracking-[0.22em]">{receiptSettings.receiptNotes}</div>
        <div className="mt-2">{receiptSettings.receiptFooter}</div>
      </div>
    </article>
  );
}
