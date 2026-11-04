import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInContent } from "@/components/sign-in-content";
import { ThemeMenu } from "@/components/theme-menu";
import { isSetupCompleted } from "@/lib/system";
import { NeedsSetup } from "@/components/needs-setup";

export default async function SignInPage() {
  const setupCompleted = await isSetupCompleted();

  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/");
  }

  if (!setupCompleted) {
    return <NeedsSetup />;
  }

  return (
    <div className="min-h-screen flex bg-bg-marketing relative overflow-hidden">
      {/* Same offsets as the signed-in navbar: its py-3/px-4 leave the h-9 cluster 12px
          from the top and 16px from the right, so the icons do not jump after login. */}
      <div className="fixed top-3 right-4 z-50">
        <ThemeMenu />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-indigo/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-violet/15 rounded-full blur-3xl" />
        </div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-brand-indigo/10 rounded-full blur-3xl" />
      </div>

      <SignInContent />
    </div>
  );
}
