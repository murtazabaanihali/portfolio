import { getPolicyContent } from "@/lib/policy-utils";
import { PolicyView } from "@/components/policies/policy-view";

export default async function TermsPage() {
  const content = await getPolicyContent("terms");
  return <PolicyView type="terms" content={content} />;
}
