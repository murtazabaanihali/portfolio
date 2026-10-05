import type { Metadata } from "next";
import { getPolicyContent } from "@/lib/policy-utils";
import { PolicyView } from "@/components/policies/policy-view";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Dhem and its associated applications, services, and developer platforms. Legally binding rules on unified accounts, acceptable use, academic data warranties, AI output disclaimers, and Indian arbitration.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | Murtaza Baanihali",
    description:
      "Terms of Service for Dhem and its associated applications, services, and developer platforms.",
    url: "/terms",
  },
};

export default function TermsPage() {
  const content = getPolicyContent("terms");
  return <PolicyView type="terms" content={content} />;
}
