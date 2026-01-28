import { useLanguage } from "../i18n/LanguageContext";
import type { PublicWebsiteData } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "../components/shared/SEO";

interface PublicLegalPageProps {
  websiteData: PublicWebsiteData;
  pageType: "cancellation" | "privacy" | "terms" | "faq";
}

export function PublicLegalPage({ websiteData, pageType }: PublicLegalPageProps) {
  const { language, t } = useLanguage();
  
  const getPageContent = () => {
    switch (pageType) {
      case "cancellation":
        return {
          title: websiteData.websiteCancellationPageTitle || t.footer.cancellation,
          content: websiteData.websiteCancellationPageContent || ""
        };
      case "privacy":
        return {
          title: websiteData.websitePrivacyPageTitle || t.footer.privacy,
          content: websiteData.websitePrivacyPageContent || ""
        };
      case "terms":
        return {
          title: websiteData.websiteTermsPageTitle || t.footer.terms,
          content: websiteData.websiteTermsPageContent || ""
        };
      case "faq":
        return {
          title: websiteData.websiteFaqPageTitle || t.footer.faq,
          content: websiteData.websiteFaqPageContent || ""
        };
      default:
        return { title: "", content: "" };
    }
  };

  const { title, content } = getPageContent();

  const renderFaqContent = () => {
    if (pageType !== "faq" || !content) return null;
    
    try {
      const faqs = JSON.parse(content);
      if (!Array.isArray(faqs)) return null;
      
      return (
        <div className="space-y-4">
          {faqs.map((faq: { question: string; answer: string }, index: number) => (
            <div key={index} className="border-b pb-4 last:border-b-0">
              <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      );
    } catch {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
  };

  return (
    <>
      <SEO
        title={title}
        description={title}
        websiteData={websiteData}
        language={language}
      />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8" data-testid="text-legal-page-title">{title}</h1>
        
        <Card>
          <CardContent className="p-6">
            {pageType === "faq" ? (
              renderFaqContent()
            ) : content ? (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {language === "en" ? "Content not available." : "İçerik henüz eklenmemiş."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
