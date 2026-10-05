import fs from "fs";
import path from "path";

export function getPolicyContent(type: "privacy" | "terms"): string {
  const fileName =
    type === "privacy" ? "privacy-policy.md" : "terms-of-service.md";
  const filePath = path.join(process.cwd(), "public/policies", fileName);
  return fs.readFileSync(filePath, "utf-8");
}
