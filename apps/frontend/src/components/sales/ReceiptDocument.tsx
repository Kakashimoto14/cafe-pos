import { BrandLogo } from "@/components/branding/BrandLogo";
import type { OrderListItem } from "@cafe/shared-types";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

type ReceiptDocumentProps = {
  order: OrderListItem;
};

export function ReceiptDocument({ order }: ReceiptDocumentProps) {
  return (
    <article className="mx-auto w-full max-w-[360px] rounded-[28px] border border-[#eadbcb] bg-white p-6 text-[#241610] shadow-[0_24px_60px_rgba(74,43,24,0.08)] print:max-w-[300px] print:rounded-none print:border-none print:p-0 print:shadow-none">
      <div className="flex justify-center">
        <BrandLogo className="h-10" />
      </div>

      <div className="mt-5 border-y border-dashed border-[#d9c2ac] py-4 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f7767]">Printed receipt</div>
        <div className="mt-2 text-lg font-semibold">{order.orderNumber}</div>
        <div className="mt-1 text-sm text-[#7b685c]">{new Date(order.createdAt).toLocaleString("en-PH")}</div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#7b685c]">Cashier</span>
          <span className="font-medium">{order.cashierName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#7b685c]">Order type</span>
          <span className="font-medium capitalize">{order.orderType.replace("_", " ")}</span>
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
                  {item.quantity} x {formatMoney(item.unitPrice)}
                </div>
              </div>
              <div className="font-medium">{formatMoney(item.lineTotal)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-dashed border-[#d9c2ac] pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
        {order.discountTotal > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-[#7b685c]">
              Discount
              {order.discountLabel ? ` (${order.discountLabel})` : ""}
            </span>
            <span>-{formatMoney(order.discountTotal)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">Tax</span>
          <span>{formatMoney(order.taxTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.grandTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">Amount paid</span>
          <span>{formatMoney(order.amountPaid)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#7b685c]">Change</span>
          <span>{formatMoney(order.changeDue)}</span>
        </div>
      </div>

      {order.notes || order.paymentNotes ? (
        <div className="mt-5 border-t border-dashed border-[#d9c2ac] pt-4 text-sm text-[#7b685c]">
          {order.notes ? <p>Order note: {order.notes}</p> : null}
          {order.paymentNotes ? <p className={order.notes ? "mt-2" : undefined}>Payment note: {order.paymentNotes}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 border-t border-dashed border-[#d9c2ac] pt-4 text-center text-xs uppercase tracking-[0.22em] text-[#8f7767]">
        Cozy Cafe POS
      </div>
    </article>
  );
}
