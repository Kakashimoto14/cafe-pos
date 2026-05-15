import type { CafeSettings, OrderListItem } from "@cafe/shared-types";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { buildReceiptViewModel } from "@/lib/receipt";
import { cn } from "@/utils/cn";

type ReceiptDocumentProps = {
  order: OrderListItem;
  settings?: CafeSettings;
  className?: string;
};

export function ReceiptDocument({ order, settings, className }: ReceiptDocumentProps) {
  const receipt = buildReceiptViewModel({ order, settings });

  return (
    <article
      className={cn(
        "mx-auto w-full max-w-[360px] rounded-[28px] border border-[#eadbcb] bg-white p-6 font-mono text-sm text-[#3b2418] shadow-[0_24px_60px_rgba(74,43,24,0.08)] print:max-w-[300px] print:rounded-none print:border-none print:p-0 print:shadow-none",
        className
      )}
    >
      {receipt.settings.showLogo ? (
        <div className="flex justify-center">
          <BrandLogo src={receipt.logoUrl} alt={`${receipt.settings.storeName} logo`} className="h-16 object-contain" />
        </div>
      ) : null}

      <div className="mt-4 text-center">
        <div className="text-lg font-bold">{receipt.headerTitle}</div>
        <div className="mt-2 text-base">{receipt.settings.storeName}</div>
        {receipt.settings.branchName ? <div>{receipt.settings.branchName}</div> : null}
        <div className="mt-3 space-y-1 text-[#7b685c]">
          {receipt.contactLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-[#d9c2ac]" />

      <div className="space-y-2">
        {receipt.metadataRows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-3">
            <span className="text-[#7b685c]">{row.label}</span>
            <span
              className={cn(
                "text-right",
                row.emphasis === "highlight" && "font-semibold tracking-[0.12em] text-[#7a4a2e]",
                row.emphasis === "total" && "text-base font-bold"
              )}
            >
              {row.label === "Queue" ? `Queue No: ${row.value}` : row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="my-4 border-t border-dashed border-[#d9c2ac]" />

      <div className="space-y-3">
        {receipt.itemRows.length === 0 ? (
          <div className="text-center text-[#7b685c]">No items recorded on this receipt.</div>
        ) : (
          receipt.itemRows.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <div className="font-medium">{item.productName}</div>
                <div className="text-[#7b685c]">{item.quantityLabel}</div>
                {item.addons.length > 0 ? (
                  <div className="mt-1 space-y-0.5 text-xs text-[#7b685c]">
                    {item.addons.map((addon) => (
                      <div key={addon}>
                        {addon}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="font-medium">{item.totalLabel}</div>
            </div>
          ))
        )}
      </div>

      <div className="my-4 border-t border-dashed border-[#d9c2ac]" />

      <div className="space-y-2">
        {receipt.totalRows.map((row) => (
          <div key={`${row.label}-${row.value}`} className="flex items-center justify-between gap-3">
            <span className={cn("text-[#7b685c]", row.emphasis === "total" && "text-[#3b2418]")}>{row.label}</span>
            <span className={cn(row.emphasis === "total" && "text-base font-bold")}>{row.value}</span>
          </div>
        ))}
      </div>

      {receipt.orderNoteRows.length > 0 ? (
        <>
          <div className="my-4 border-t border-dashed border-[#d9c2ac]" />
          <div className="space-y-2 text-[#7b685c]">
            {receipt.orderNoteRows.map((row) => (
              <div key={`${row.label}-${row.value}`}>
                <span className="text-[#5f4637]">{row.label}:</span> {row.value}
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="my-4 border-t border-dashed border-[#d9c2ac]" />

      <div className="space-y-2 text-center text-xs text-[#7b685c]">
        {receipt.footerLines.map((line, index) => (
          <div key={`${line}-${index}`} className={index === 0 ? "uppercase tracking-[0.22em]" : undefined}>
            {line}
          </div>
        ))}
      </div>
    </article>
  );
}
