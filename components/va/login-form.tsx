"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { loginAction } from "@/app/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginSchema } from "@/lib/validators/auth";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      role: "admin",
      accessKey: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);

    startTransition(async () => {
      const result = await loginAction(values);

      if (!result.ok) {
        const firstError = result.fieldErrors
          ? Object.values(result.fieldErrors)
              .flat()
              .find(Boolean)
          : null;

        setError(firstError || result.message);
        return;
      }

      toast.success("Welcome back.");
      const target = redirectTo && redirectTo !== "/login" ? redirectTo : values.role === "owner" ? "/owner" : "/admin";
      router.push(target);
      router.refresh();
    });
  });

  return (
    <Card className="w-full max-w-md rounded-3xl border-zinc-200 bg-white/95 shadow-soft">
      <CardHeader>
        <CardTitle className="text-2xl">Tentmakers Access</CardTitle>
        <CardDescription>Choose your role and enter the shared access key.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert className="border-rose-200 bg-rose-50 text-rose-900">
            <AlertTitle>Sign in failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              {...form.register("role")}
            >
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accessKey">Access key</Label>
            <Input id="accessKey" type="password" autoComplete="current-password" placeholder="••••••••" {...form.register("accessKey")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
