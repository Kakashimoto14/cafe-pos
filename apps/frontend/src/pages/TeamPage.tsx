import { useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, UserCog, UserPlus, Users2, X } from "lucide-react";
import type { AppRole } from "@cafe/shared-types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaginationControls, PageEmptyState, PageErrorState, SectionCardSkeleton } from "@/components/ui/page-states";
import { appQueryOptions } from "@/lib/app-queries";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";

const roles: AppRole[] = ["admin", "manager", "cashier"];

export function TeamPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", role: "cashier" as AppRole, temporaryPassword: "" });
  const limit = 10;

  useEffect(() => {
    setPage(1);
  }, [deferredQuery]);

  const teamQuery = useQuery(
    appQueryOptions.team({
      page,
      limit,
      search: deferredQuery.trim() || undefined
    })
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, role, isActive }: { id: string; role?: AppRole; isActive?: boolean }) =>
      apiClient.updateProfile(id, { role, isActive }),
    onSuccess: () => {
      toast.success("Team access updated.");
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const createUserMutation = useMutation({
    mutationFn: () => apiClient.createUser(newUser),
    onSuccess: () => {
      toast.success("User created.");
      setAddUserOpen(false);
      setNewUser({ fullName: "", email: "", role: "cashier", temporaryPassword: "" });
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const profiles = teamQuery.data?.data ?? [];

  if (teamQuery.isLoading && profiles.length === 0) {
    return <SectionCardSkeleton rows={4} />;
  }

  if (teamQuery.isError) {
    return <PageErrorState title="Team unavailable" message={teamQuery.error.message} onRetry={() => void teamQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Team</div>
          <h1 className="mt-3 font-display text-4xl text-[#241610]">Team</h1>
        </div>
        {currentUser?.role === "admin" ? (
          <Button type="button" onClick={() => setAddUserOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        ) : null}
      </section>

      <Card className="flex items-center gap-3 border-[#eadbcb] bg-white px-4 py-3">
        <Search className="h-5 w-5 text-[#9a8170]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, or role"
          className="w-full border-0 bg-transparent p-0 text-sm outline-none"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </Card>

      {teamQuery.isFetching && profiles.length > 0 ? <div className="text-sm text-[#8f7767]">Refreshing operator accounts...</div> : null}

      {profiles.length === 0 ? (
        <PageEmptyState
          icon={<Users2 className="h-8 w-8" />}
          title="No team members found"
          description={deferredQuery.trim() ? "Try another name, email, or role." : "Create a staff account to manage operator access from this screen."}
        />
      ) : null}

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="border-[#eadbcb] bg-white p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">
                  <ShieldCheck className="h-4 w-4" />
                  {profile.role}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-[#241610]">{profile.name}</h2>
                <p className="mt-1 text-sm text-[#7b685c]">{profile.email}</p>
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: profile.id, role })}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                        profile.role === role ? "bg-[#7a4a2e] text-white" : "bg-[#f6eee5] text-[#6c584b] hover:bg-[#efe3d3]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: profile.id,
                      isActive: !profile.isActive
                    })
                  }
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    profile.isActive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                  }`}
                >
                  <UserCog className="mr-2 inline h-4 w-4" />
                  {profile.isActive ? "Deactivate account" : "Reactivate account"}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <PaginationControls
        page={teamQuery.data?.meta.page ?? page}
        totalPages={teamQuery.data?.meta.totalPages ?? 0}
        label={teamQuery.data ? `${teamQuery.data.meta.total} team members` : undefined}
        onPageChange={setPage}
      />

      {addUserOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <Card className="w-full max-w-xl border-[#eadbcb] bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Admin action</div>
                <h2 className="mt-2 text-3xl font-semibold text-[#241610]">Add user</h2>
              </div>
              <button type="button" className="text-sm font-medium text-[#7b685c]" onClick={() => setAddUserOpen(false)}>
                Close
              </button>
            </div>

            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
                  toast.error("Enter a valid email address.");
                  return;
                }

                if (newUser.temporaryPassword.length < 8 || !/[A-Za-z]/.test(newUser.temporaryPassword) || !/\d/.test(newUser.temporaryPassword)) {
                  toast.error("Temporary password needs at least 8 characters, 1 letter, and 1 number.");
                  return;
                }

                createUserMutation.mutate();
              }}
            >
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Full name</span>
                <input
                  value={newUser.fullName}
                  onChange={(event) => setNewUser((state) => ({ ...state, fullName: event.target.value }))}
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Email</span>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((state) => ({ ...state, email: event.target.value }))}
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Role</span>
                <select
                  value={newUser.role}
                  onChange={(event) => setNewUser((state) => ({ ...state, role: event.target.value as AppRole }))}
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Temporary password</span>
                <input
                  type="password"
                  value={newUser.temporaryPassword}
                  onChange={(event) => setNewUser((state) => ({ ...state, temporaryPassword: event.target.value }))}
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                  required
                />
              </label>
              <div className="flex gap-3">
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create user"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAddUserOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
