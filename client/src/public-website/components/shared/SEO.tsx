import { Helmet } from "react-helmet-async";
import type { PublicWebsiteData, PublicActivity } from "../../types";

interface SEOProps {
  websiteData?: PublicWebsiteData;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  activity?: PublicActivity;
  noIndex?: boolean;
  language?: string;
  alternateLanguages?: { lang: string; url: string }[];
}

export function SEO({
  websiteData,
  title,
  description,
  image,
  url,
  type = "website",
  activity,
  noIndex = false,
  language = "tr",
  alternateLanguages = [],
}: SEOProps) {
  const siteName = websiteData?.websiteDisplayName || websiteData?.name || "Rezervasyon";
  const siteTitle = title ? `${title} | ${siteName}` : websiteData?.websiteTitle || siteName;
  const siteDescription = description || websiteData?.websiteDescription || "";
  const siteImage = image || websiteData?.websiteHeroImageUrl || "";
  const siteUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const domain = websiteData?.websiteDomain || (typeof window !== "undefined" ? window.location.origin : "");

  const canonicalUrl = siteUrl.split("?")[0];

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": activity ? "Product" : "Organization",
  };

  if (activity) {
    Object.assign(structuredData, {
      "@type": "Product",
      name: activity.name,
      description: activity.description,
      image: activity.imageUrl,
      offers: {
        "@type": "Offer",
        price: activity.price,
        priceCurrency: "TRY",
        availability: "https://schema.org/InStock",
      },
    });
  } else {
    const socialLinks: string[] = [];
    if (websiteData?.websiteSocialLinks) {
      const social = websiteData.websiteSocialLinks;
      if (social.facebook) socialLinks.push(social.facebook);
      if (social.instagram) socialLinks.push(social.instagram);
      if (social.twitter) socialLinks.push(social.twitter);
      if (social.youtube) socialLinks.push(social.youtube);
    }

    Object.assign(structuredData, {
      "@type": "Organization",
      name: siteName,
      description: siteDescription,
      url: domain,
      logo: websiteData?.logoUrl,
      contactPoint: websiteData?.websiteContactEmail || websiteData?.websiteContactPhone ? {
        "@type": "ContactPoint",
        email: websiteData?.websiteContactEmail,
        telephone: websiteData?.websiteContactPhone,
        contactType: "customer service",
      } : undefined,
      address: websiteData?.websiteContactAddress ? {
        "@type": "PostalAddress",
        streetAddress: websiteData?.websiteContactAddress,
      } : undefined,
      sameAs: socialLinks.length > 0 ? socialLinks : undefined,
    });
  }

  return (
    <Helmet>
      <html lang={language} />
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      <link rel="canonical" href={canonicalUrl} />
      
      {alternateLanguages.map(({ lang, url: altUrl }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={altUrl} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={language === "tr" ? "tr_TR" : "en_US"} />
      {siteImage && <meta property="og:image" content={siteImage} />}
      {siteImage && <meta property="og:image:width" content="1200" />}
      {siteImage && <meta property="og:image:height" content="630" />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      {siteImage && <meta name="twitter:image" content={siteImage} />}

      {activity && (
        <>
          <meta property="product:price:amount" content={String(activity.price)} />
          <meta property="product:price:currency" content="TRY" />
        </>
      )}

      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      {websiteData?.websiteFaviconUrl && (
        <link rel="icon" href={websiteData.websiteFaviconUrl} />
      )}
    </Helmet>
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  if (!faqs || faqs.length === 0) return null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
