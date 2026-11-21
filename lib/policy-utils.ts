import { cdnUrl } from "@/lib/blog/config";

const policyFiles = {
  privacy: "privacy-policy.md",
  terms: "terms-of-service.md",
} as const;

export async function getPolicyContent(type: keyof typeof policyFiles): Promise<string> {
  const url = cdnUrl(`assets/plocies/${policyFiles[type]}`);
  // Use the media CDN's cache without pinning policy content to an app build.
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not fetch the ${type} policy (HTTP ${response.status})`);
  }

  return response.text();
}
