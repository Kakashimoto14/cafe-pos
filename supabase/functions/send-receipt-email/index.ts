import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildReceiptEmailViewModel, mapBusinessSettings, normalizeReceiptOrder, renderReceiptEmailHtml, renderReceiptEmailText } from "../_shared/receipt.ts";
import { sendEmail } from "../_shared/smtp.ts";

type AppRole = "admin" | "manager" | "cashier";

type SendReceiptEmailPayload = {
  orderId?: string;
  recipientEmail?: string;
};

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePayload(payload: SendReceiptEmailPayload) {
  const orderId = payload.orderId?.trim() ?? "";
  const recipientEmail = payload.recipientEmail?.trim().toLowerCase() ?? "";

  if (!orderId) {
    throw new HttpError("Order ID is required.", 400);
  }

  if (recipientEmail && !validateEmail(recipientEmail)) {
    throw new HttpError("Enter a valid recipient email address.", 400);
  }

  return {
    orderId,
    recipientEmail: recipientEmail || undefined
  };
}

function resolveRecipientEmail(explicitRecipient: string | undefined, fallbackRecipient: string | null | undefined) {
  const resolved = explicitRecipient?.trim().toLowerCase() || fallbackRecipient?.trim().toLowerCase() || "";

  if (!resolved) {
    throw new HttpError("Add a customer email before sending this receipt.", 400);
  }

  if (!validateEmail(resolved)) {
    throw new HttpError("Enter a valid recipient email address.", 400);
  }

  return resolved;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new HttpError("Receipt email is not configured.", 500);
    }

    if (!token) {
      throw new HttpError("Authenticated session required.", 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      throw new HttpError("Authenticated session required.", 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: requesterProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const requesterRole = requesterProfile?.role as AppRole | undefined;

    if (profileError || !requesterProfile?.is_active || !requesterRole || !["admin", "manager", "cashier"].includes(requesterRole)) {
      throw new HttpError("Only active staff can send receipts.", 403);
    }

    const payload = validatePayload((await req.json()) as SendReceiptEmailPayload);

    const { data: orderData, error: orderError } = await adminClient
      .from("orders")
      .select(
        "id, order_number, queue_number, customer_email, receipt_settings_snapshot, order_type, payment_method, notes, subtotal, discount_label, discount_total, tax_total, grand_total, amount_paid, change_due, payment_reference, payment_notes, created_at, profiles!orders_cashier_id_fkey(full_name), order_items(id, product_name, quantity, unit_price, line_total, order_item_addons(addon_name, price_delta, quantity))"
      )
      .eq("id", payload.orderId)
      .single();

    if (orderError || !orderData) {
      throw new HttpError("Receipt order could not be found.", 404);
    }

    const { data: businessSettingsRow, error: businessSettingsError } = await adminClient
      .from("business_settings")
      .select(
        "store_name, branch_name, contact_number, email, address, business_info, logo_url, receipt_header, receipt_footer, receipt_notes, show_logo, show_cashier_name, show_order_number, show_queue_number, tax_label, tax_rate, currency"
      )
      .eq("settings_key", "default")
      .maybeSingle();

    if (businessSettingsError) {
      throw new HttpError("Receipt branding could not be loaded.", 500);
    }

    const order = normalizeReceiptOrder(orderData as Record<string, unknown>);
    const recipientEmail = resolveRecipientEmail(payload.recipientEmail, order.customer_email);
    const receipt = buildReceiptEmailViewModel({
      order,
      businessSettings: mapBusinessSettings(businessSettingsRow ?? null)
    });

    await sendEmail({
      to: recipientEmail,
      subject: receipt.subject,
      html: renderReceiptEmailHtml(receipt),
      text: renderReceiptEmailText(receipt)
    });

    return jsonResponse({
      success: true,
      recipientEmail,
      message: "Receipt sent successfully."
    });
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status >= 500) {
        console.error("Receipt email failed", error.message);
      }

      return jsonResponse({ error: error.message }, error.status);
    }

    const message = error instanceof Error ? error.message : "Receipt email could not be sent.";
    console.error("Receipt email failed", message);
    return jsonResponse({ error: message || "Receipt email could not be sent." }, 500);
  }
});
