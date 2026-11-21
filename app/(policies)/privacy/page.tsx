"use client";

import { getPolicyContent } from "@/lib/policy-utils";
import { PolicyView } from "@/components/policies/policy-view";

export default function PrivacyPage() {
  const content = getPolicyContent("privacy");
  return <PolicyView type="privacy" content={content} />;
}
