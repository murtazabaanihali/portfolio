import { getPolicyContent } from "@/lib/policy-utils";
import { PolicyView } from "@/components/policies/policy-view";

export default async function PrivacyPage() {
  const content = await getPolicyContent("privacy");
  return <PolicyView type="privacy" content={content} />;
}
