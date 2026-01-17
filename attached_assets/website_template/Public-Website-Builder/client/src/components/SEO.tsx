import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import type { AgencyInfo } from "@shared/schema";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
}

export function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
}: SEOProps) {
  const { data: agency } = useQuery<AgencyInfo>({
    queryKey: ["/api/agency"],
  });

  const siteTitle = agency?.name || "Smartur Travel";
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const metaDescription = description || agency?.metaDescription || agency?.description || "";
  const metaKeywords = keywords || agency?.metaKeywords || "";
  const ogImage = image || agency?.heroImage || "";
  const siteUrl = url || window.location.href;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {metaKeywords && <meta name="keywords" content={metaKeywords} />}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={siteUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      
      <link rel="canonical" href={siteUrl} />
    </Helmet>
  );
}
