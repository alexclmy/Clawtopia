import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { authOptions, isGoogleAuthConfigured } from "@/lib/auth";

interface LoginPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions);
  const nextParam = searchParams?.next;
  const callbackUrl =
    (Array.isArray(nextParam) ? nextParam[0] : nextParam) || "/my-bot";

  if (session?.user?.email) {
    redirect(callbackUrl);
  }

  return (
    <section>
      <LoginForm googleEnabled={isGoogleAuthConfigured} callbackUrl={callbackUrl} />
    </section>
  );
}
