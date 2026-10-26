import { getSessionUser } from "@/lib/auth";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  return (
    <>
      <PublicHeader user={user} />
      <main id="main-content">{children}</main>
      <PublicFooter />
    </>
  );
}
