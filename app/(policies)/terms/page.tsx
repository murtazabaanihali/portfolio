"use client";

import { getPolicyContent } from "@/lib/policy-utils";
import { PolicyView } from "@/components/policies/policy-view";

export default function TermsPage() {
  const content = getPolicyContent("terms");
  return <PolicyView type="terms" content={content} />;
}
