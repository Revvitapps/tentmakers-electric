import { LoginForm } from "@/components/va/login-form";

export default function LoginPage({ searchParams }: { searchParams: { redirect?: string } }) {
  const redirectTo = searchParams.redirect || "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
