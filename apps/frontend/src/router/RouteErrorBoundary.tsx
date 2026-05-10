import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function RouteErrorBoundary() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unexpected application error.";

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-xl border-[#eadbcb] p-6 md:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Application fault</div>
        <h1 className="mt-3 font-display text-4xl text-[#241610]">Something went wrong</h1>
        <p className="mt-4 text-sm text-[#7b685c]">{message}</p>
        <div className="mt-6">
          <Button onClick={() => window.location.assign("/login")}>Return to login</Button>
        </div>
      </Card>
    </div>
  );
}
