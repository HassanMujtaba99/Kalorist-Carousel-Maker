import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { authViewClassNames } from "@/lib/authViewClassNames";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="kal-card w-full max-w-md">
        <AuthView pathname={path} classNames={authViewClassNames} />
      </div>
    </div>
  );
}
