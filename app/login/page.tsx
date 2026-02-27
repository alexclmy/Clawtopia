import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { isDemoAuthEnabled, isGoogleAuthConfigured } from "@/lib/auth";
import { getAuthSession } from "@/lib/auth-session";

interface LoginPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAuthSession();
  const nextParam = searchParams?.next;
  const callbackUrl = (Array.isArray(nextParam) ? nextParam[0] : nextParam) || "/my-bot";

  if (session?.email) {
    redirect(callbackUrl);
  }

  return (
    <section>
      <LoginForm
        googleEnabled={isGoogleAuthConfigured}
        demoEnabled={isDemoAuthEnabled}
        callbackUrl={callbackUrl}
      />
    </section>
  );
}
