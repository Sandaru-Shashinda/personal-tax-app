import type { MetadataRoute } from "next";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tax-calculator", "/sri-lanka-income-tax", "/sri-lanka-tax-guide", "/tax-deadlines", "/about"],
        disallow: ["/api/", "/dashboard", "/income", "/expenses", "/tax/", "/tax$", "/payments", "/documents", "/reports", "/calendar", "/settings", "/admin", "/onboarding", "/login", "/register", "/go"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
