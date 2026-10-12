import privacyPolicyContent from "@/public/policies/privacy-policy.md";
import termsOfServiceContent from "@/public/policies/terms-of-service.md";

export function getPolicyContent(type: "privacy" | "terms"): string {
  return type === "privacy" ? privacyPolicyContent : termsOfServiceContent;
}
