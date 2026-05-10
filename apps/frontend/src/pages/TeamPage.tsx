import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserCog } from "lucide-react";
import type { AppRole } from "@cafe/shared-types";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

const roles: AppRole[] = ["admin", "manager", "cashier"];

export function TeamPage() {
  const queryClient = useQueryClient();
  const teamQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiClient.listProfiles()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role, isActive }: { id: string; role?: AppRole; isActive?: boolean }) =>
      apiClient.updateProfile(id, { role, isActive }),
    onSuccess: () => {
      toast.success("Team access updated.");
      void queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error) => toast.error(error.message)
  });

  if (teamQuery.isLoading) {
    return <Card className="p-6 text-sm text-[#7b685c]">Loading operator accounts...</Card>;
  }

  if (teamQuery.isError) {
    return <Card className="p-6 text-sm text-rose-500">{teamQuery.error.message}</Card>;
  }

  const profiles = teamQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section>
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Access control</div>
        <h1 className="mt-3 font-display text-4xl text-[#241610]">Team accounts</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
          Admin-only workspace for assigning cashier, manager, and admin privileges.
        </p>
      </section>

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
    </div>
  );
}
