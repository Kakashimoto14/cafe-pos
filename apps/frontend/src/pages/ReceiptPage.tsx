import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Mail, Printer } from "lucide-react";
import { toast } from "sonner";
import { ReceiptDocument } from "@/components/sales/ReceiptDocument";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCafeSettings } from "@/hooks/use-cafe-settings";
import { apiClient } from "@/services/api-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const settingsQuery = useCafeSettings();
  const [isEmailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  const receiptQuery = useQuery({
    queryKey: ["orders", orderId, "receipt"],
    queryFn: () => apiClient.getOrderById(orderId ?? ""),
    enabled: Boolean(orderId)
  });

  useEffect(() => {
    if (receiptQuery.data?.customerEmail) {
      setRecipientEmail(receiptQuery.data.customerEmail);
    }
  }, [receiptQuery.data?.customerEmail]);

  useEffect(() => {
    const storeName = settingsQuery.data?.storeName ?? "Cafe POS";
    document.title = `Receipt | ${storeName}`;
    return () => {
      document.title = storeName;
    };
  }, [settingsQuery.data?.storeName]);

  const sendReceiptEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!receiptQuery.data) {
        throw new Error("Receipt is not loaded yet.");
      }

      return apiClient.sendReceiptEmail({
        orderId: receiptQuery.data.id,
        recipientEmail: email
      });
    },
    onSuccess: (result) => {
      toast.success(result.message || "Receipt sent successfully.");
      setEmailDialogOpen(false);
      setRecipientEmail(result.recipientEmail);
    },
    onError: (error) => {
      toast.error("Could not send receipt.", {
        description: error.message || "Check SMTP settings or the recipient email and try again."
      });
    }
  });

  const handleSendReceipt = (event: FormEvent) => {
    event.preventDefault();

    const email = recipientEmail.trim().toLowerCase();

    if (!email) {
      toast.error("Enter a recipient email before sending the receipt.");
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      toast.error("Enter a valid recipient email address.");
      return;
    }

    sendReceiptEmailMutation.mutate(email);
  };

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
    <>
      <div className="space-y-4 p-4 md:p-6 print:p-0">
        <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
          <Button variant="secondary" onClick={() => setEmailDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Email receipt
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print receipt
          </Button>
        </div>
        {receiptQuery.data.customerEmail ? (
          <div className="text-right text-sm text-[#7b685c] print:hidden">
            Default recipient: <span className="font-medium text-[#4f3526]">{receiptQuery.data.customerEmail}</span>
          </div>
        ) : null}
        <ReceiptDocument order={receiptQuery.data} settings={settingsQuery.data} />
      </div>

      {isEmailDialogOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4 print:hidden">
          <div className="w-full max-w-md rounded-[28px] border border-[#eadbcb] bg-white p-6 shadow-[0_30px_70px_rgba(74,43,24,0.18)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Receipt delivery</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#241610]">Email receipt</h2>
            <p className="mt-2 text-sm leading-6 text-[#7b685c]">
              Send the latest receipt copy to the guest or to a store inbox for follow-up.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSendReceipt}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Recipient email</span>
                <input
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#eadbcb] bg-[#fffdf9] px-4 text-[#241610]"
                  placeholder="guest@example.com"
                  inputMode="email"
                  autoFocus
                />
              </label>
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEmailDialogOpen(false)}
                  disabled={sendReceiptEmailMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sendReceiptEmailMutation.isPending}>
                  {sendReceiptEmailMutation.isPending ? "Sending..." : "Send receipt"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
