const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  console.error("Missing SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY environment variables.");
  process.exit(1);
}

const demoAccounts = [
  { email: "admin@cafeposdemo.com", password: "CafePos123!", full_name: "Cafe Admin" },
  { email: "manager@cafeposdemo.com", password: "CafePos123!", full_name: "Cafe Manager" },
  { email: "cashier@cafeposdemo.com", password: "CafePos123!", full_name: "Cafe Cashier" }
];

for (const account of demoAccounts) {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      data: {
        full_name: account.full_name
      }
    })
  });

  const payload = await response.json();

  if (!response.ok && payload?.msg !== "User already registered") {
    console.error(`Failed to seed ${account.email}:`, payload);
    process.exit(1);
  }

  console.log(`Seeded ${account.email}`);
}
