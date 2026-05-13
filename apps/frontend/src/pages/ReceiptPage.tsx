import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { ReceiptDocument } from "@/components/sales/ReceiptDocument";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCafeSettings } from "@/hooks/use-cafe-settings";
import { apiClient } from "@/services/api-client";

export function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const settingsQuery = useCafeSettings();

  const receiptQuery = useQuery({
    queryKey: ["orders", orderId, "receipt"],
    queryFn: () => apiClient.getOrderById(orderId ?? ""),
    enabled: Boolean(orderId)
  });

  useEffect(() => {
    const storeName = settingsQuery.data?.storeName ?? "Cafe POS";
    document.title = `Receipt | ${storeName}`;
    return () => {
      document.title = storeName;
    };
  }, [settingsQuery.data?.storeName]);

  if (receiptQuery.isLoading) {
    return (
      <div className="p-6 print:p-0">
        <Card className="p-6 text-sm text-[#7b685c]">Loading receipt...</Card>
      </div>
    );
  }

  if (receiptQuery.isError || !receiptQuery.data) {
    return (
      <div className="p-6 print:p-0">
        <Card className="p-6 text-sm text-rose-500">
          {receiptQuery.error instanceof Error ? receiptQuery.error.message : "Unable to load this receipt."}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6 print:p-0">
      <div className="flex items-center justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print receipt
        </Button>
      </div>
      <ReceiptDocument order={receiptQuery.data} settings={settingsQuery.data} />
    </div>
  );
}
