import type { Metadata } from "next";
import { getPolicyContent } from "@/lib/policy-utils";
import { PolicyView } from "@/components/policies/policy-view";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Dhem and its associated applications, services, and developer platforms. Comprehensive disclosures on data protection, telemetry, AI processing, and statutory rights under the DPDP Act, GDPR, and CCPA.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Murtaza Baanihali",
    description:
      "Privacy Policy for Dhem and its associated applications, services, and developer platforms.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  const content = getPolicyContent("privacy");
  return <PolicyView type="privacy" content={content} />;
}
