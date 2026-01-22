export interface PublicActivity {
  id: number;
  name: string;
  description: string | null;
  price: number;
  priceUsd: number | null;
  durationMinutes: number;
  defaultTimes: string[];
  hasFreeHotelTransfer: boolean;
  transferZones: string[];
  extras: Array<{ name: string; priceTl: number; priceUsd: number; description?: string }>;
  faq: Array<{ question: string; answer: string }>;
  imageUrl: string | null;
  galleryImages: string[];
  // Tur satış özellikleri
  region: string | null;
  tourLanguages: string[];
  difficulty: string | null;
  includedItems: string[];
  excludedItems: string[];
  meetingPoint: string | null;
  categories: string[];
  highlights: string[];
  minAge: number | null;
  maxParticipants: number | null;
  // Ödeme seçenekleri
  requiresDeposit: boolean;
  depositType: "percentage" | "fixed";
  depositAmount: number;
  fullPaymentRequired: boolean;
}

export interface WebsiteTemplateSettings {
  heroSlides?: Array<{
    imageUrl: string;
    title?: string;
    subtitle?: string;
  }>;
  testimonials?: Array<{
    name: string;
    rating: number;
    text: string;
    avatar?: string;
    date?: string;
  }>;
  trustBadges?: Array<{
    icon?: string;
    title: string;
    description?: string;
  }>;
  featuredCategories?: string[];
  showWhatsAppButton?: boolean;
  showTrustBadges?: boolean;
  showTestimonials?: boolean;
  showGallery?: boolean;
}

export interface PublicWebsiteData {
  id: number;
  name: string;
  slug: string;
  websiteEnabled: boolean;
  websiteDomain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  websiteTitle: string | null;
  websiteDescription: string | null;
  websiteFaviconUrl: string | null;
  websiteHeroImageUrl: string | null;
  websiteAboutText: string | null;
  websiteFooterText: string | null;
  websiteSocialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  websiteWhatsappNumber: string | null;
  websiteLanguages: string[];
  websiteContactPageTitle: string | null;
  websiteContactPageContent: string | null;
  websiteContactEmail: string | null;
  websiteContactPhone: string | null;
  websiteContactAddress: string | null;
  websiteAboutPageTitle: string | null;
  websiteAboutPageContent: string | null;
  websiteCancellationPageTitle: string | null;
  websiteCancellationPageContent: string | null;
  websitePrivacyPageTitle: string | null;
  websitePrivacyPageContent: string | null;
  websiteTermsPageTitle: string | null;
  websiteTermsPageContent: string | null;
  websiteFaqPageTitle: string | null;
  faqItems: Array<{ question: string; answer: string }>;
  // Footer ayarları
  websiteDisplayName: string | null;
  websiteFooterCompanyDescription: string | null;
  websiteFooterPaymentImageUrl: string | null;
  websiteFooterCopyrightText: string | null;
  websiteFooterBackgroundColor: string | null;
  websiteFooterTextColor: string | null;
  websiteHeaderBackgroundColor: string | null;
  websiteHeaderTextColor: string | null;
  // Şablon sistemi
  websiteTemplateKey: string | null;
  websiteTemplateSettings: WebsiteTemplateSettings;
}

export interface AvailabilitySlot {
  activityId: number;
  date: string;
  time: string;
  totalSlots: number;
  bookedSlots: number;
  available: number;
}

export type TemplateKey = "classic" | "modern" | "premium";
