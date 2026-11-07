import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      "node_modules/**",
      ".work/**",
      "dist/**",
      "build/**",
      "tools/**",
    ],
  },
  ...nextConfig,
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
