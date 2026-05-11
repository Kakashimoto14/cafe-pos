import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type AppRole = "admin" | "manager" | "cashier";

type CreateUserPayload = {
  fullName?: string;
  email?: string;
  role?: AppRole;
  temporaryPassword?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function validatePayload(payload: CreateUserPayload) {
  const fullName = payload.fullName?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const role = payload.role;
  const temporaryPassword = payload.temporaryPassword ?? "";

  if (fullName.length < 2) {
    throw new Error("Full name is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (role !== "admin" && role !== "manager" && role !== "cashier") {
    throw new Error("Choose a valid role.");
  }

  if (temporaryPassword.length < 8 || !/[A-Za-z]/.test(temporaryPassword) || !/\d/.test(temporaryPassword)) {
    throw new Error("Temporary password needs at least 8 characters, 1 letter, and 1 number.");
  }

  return { fullName, email, role, temporaryPassword };
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
      return jsonResponse({ error: "User creation is not configured." }, 500);
    }

    if (!token) {
      return jsonResponse({ error: "Authenticated session required." }, 401);
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
      return jsonResponse({ error: "Authenticated session required." }, 401);
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

    if (profileError || !requesterProfile?.is_active || requesterProfile.role !== "admin") {
      return jsonResponse({ error: "Only admins can create users." }, 403);
    }

    const payload = validatePayload((await req.json()) as CreateUserPayload);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: payload.temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName
      }
    });

    if (createError || !created.user) {
      const message = createError?.message ?? "Unable to create user.";
      const status = /already|registered|exists/i.test(message) ? 409 : 400;
      return jsonResponse({ error: message }, status);
    }

    const { data: profile, error: upsertError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: created.user.id,
          email: payload.email,
          full_name: payload.fullName,
          role: payload.role,
          is_active: true
        },
        { onConflict: "id" }
      )
      .select("id, email, full_name, role, is_active")
      .single();

    if (upsertError || !profile) {
      return jsonResponse({ error: upsertError?.message ?? "User was created, but profile setup failed." }, 500);
    }

    return jsonResponse({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
        isActive: profile.is_active
      }
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to create user." }, 400);
  }
});
