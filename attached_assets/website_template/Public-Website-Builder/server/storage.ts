import { randomUUID } from "crypto";
import type {
  AgencyInfo,
  AgencySettings,
  Activity,
  ActivityCategory,
  AvailabilitySlot,
  Reservation,
  CreateReservation,
  ContactForm,
} from "@shared/schema";

const mockAgency: AgencyInfo = {
  id: "agency-1",
  name: "Aegean Adventures",
  slug: "aegean-adventures",
  description: "Discover the beauty of the Aegean coast with our curated tours and unforgettable experiences. We've been creating memories for travelers since 2010.",
  phone: "+90 252 316 1234",
  whatsapp: "+905321234567",
  email: "info@aegeanadventures.com",
  address: "Cumhuriyet Mah. Atatürk Cad. No:42, Bodrum, Muğla, Turkey",
  mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25161.89877927478!2d27.4239!3d37.0344!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14bef7c6a2c07d1f%3A0x4e1f5e3c1c1c1c1c!2sBodrum%2C%20Mu%C4%9Fla!5e0!3m2!1sen!2str!4v1234567890",
  heroImage: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80",
  heroTitle: "Discover Unforgettable Adventures",
  heroSubtitle: "Explore the stunning Aegean coast with our premium tours and activities",
  aboutText: "Since 2010, Aegean Adventures has been the leading tour operator in the Bodrum region. Our passionate team of local experts crafts unique experiences that showcase the natural beauty, rich history, and vibrant culture of Turkey's Aegean coast. From thrilling boat tours to serene sunset cruises, from ancient ruins to hidden coves, we offer something for every traveler.",
  socialLinks: {
    facebook: "https://facebook.com/aegeanadventures",
    instagram: "https://instagram.com/aegeanadventures",
    twitter: "https://twitter.com/aegeanadv",
    youtube: "https://youtube.com/aegeanadventures",
  },
  metaDescription: "Book unforgettable tours and activities in Bodrum with Aegean Adventures. Boat tours, diving, historical tours and more.",
  metaKeywords: "Bodrum tours, Aegean activities, boat tours Turkey, diving Bodrum",
};

const mockCategories: ActivityCategory[] = [
  { id: "cat-1", name: "Boat Tours", slug: "boat-tours", icon: "ship" },
  { id: "cat-2", name: "Diving & Snorkeling", slug: "diving", icon: "waves" },
  { id: "cat-3", name: "Historical Tours", slug: "historical", icon: "landmark" },
  { id: "cat-4", name: "Adventure", slug: "adventure", icon: "mountain" },
  { id: "cat-5", name: "Sunset Cruises", slug: "sunset", icon: "sunset" },
];

const mockActivities: Activity[] = [
  {
    id: "act-1",
    name: "Bodrum Bay Cruise",
    slug: "bodrum-bay-cruise",
    shortDescription: "Sail around the stunning Bodrum bays with swimming stops at crystal-clear waters.",
    description: "Experience the magic of Bodrum's coastline on this full-day sailing adventure. Our traditional wooden gulet will take you to the most beautiful bays around the Bodrum peninsula.\n\nYou'll stop at several secluded coves where you can swim in the crystal-clear turquoise waters, snorkel among colorful fish, or simply relax on the deck and soak up the Mediterranean sun.\n\nA delicious lunch prepared by our onboard chef is included, featuring fresh local ingredients and traditional Turkish cuisine. Enjoy refreshments and snacks throughout the day as you cruise past historic landmarks and picturesque villages.\n\nThis tour is perfect for families, couples, and anyone looking to experience the best of the Aegean Sea.",
    images: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
      "https://images.unsplash.com/photo-1559628233-100c798642d4?w=800&q=80",
    ],
    thumbnail: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80",
    categoryId: "cat-1",
    categoryName: "Boat Tours",
    price: 65,
    originalPrice: 85,
    currency: "USD",
    duration: "8 hours",
    durationMinutes: 480,
    location: "Bodrum Harbor",
    maxParticipants: 30,
    minParticipants: 4,
    included: ["Lunch", "Soft drinks & water", "Snorkeling equipment", "Insurance", "Hotel transfer"],
    excluded: ["Alcoholic beverages", "Personal expenses", "Tips"],
    highlights: ["Swim in 4 different bays", "Fresh seafood lunch onboard", "Visit ancient ruins", "Watch sunset over the sea", "Professional crew & guide"],
    requirements: ["Swimwear recommended", "Sunscreen", "Camera"],
    meetingPoint: "Bodrum Harbor, Pier 3",
    languages: ["English", "Turkish", "German", "Russian"],
    rating: 4.8,
    reviewCount: 342,
    isFeatured: true,
    isActive: true,
  },
  {
    id: "act-2",
    name: "Scuba Diving Experience",
    slug: "scuba-diving-experience",
    shortDescription: "Discover the underwater world of Bodrum with certified diving instructors.",
    description: "Dive into an unforgettable underwater adventure with our professional scuba diving experience. Whether you're a beginner or an experienced diver, Bodrum's underwater world has something spectacular to offer.\n\nFor beginners, our PADI-certified instructors provide a comprehensive briefing and pool training before taking you to shallow, calm waters for your first dive. You'll learn essential skills and safety procedures in a relaxed, supportive environment.\n\nExperienced divers can explore deeper sites featuring ancient amphora, colorful marine life, and dramatic underwater rock formations. Our dive sites include famous spots like Aquarium Bay and Big Reef.\n\nAll equipment is provided, including high-quality wetsuits, tanks, and BCDs. We maintain small group sizes to ensure personal attention and safety.",
    images: [
      "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800&q=80",
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80",
    ],
    thumbnail: "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=600&q=80",
    categoryId: "cat-2",
    categoryName: "Diving & Snorkeling",
    price: 95,
    currency: "USD",
    duration: "5 hours",
    durationMinutes: 300,
    location: "Bodrum Diving Center",
    maxParticipants: 8,
    minParticipants: 2,
    included: ["Full diving equipment", "PADI certification for beginners", "Lunch", "Insurance", "Photos"],
    excluded: ["Hotel transfer", "Tips"],
    highlights: ["PADI-certified instructors", "Two dive sessions", "Underwater photography", "Explore ancient amphora", "See colorful marine life"],
    requirements: ["Swimming ability required", "Minimum age 12 years", "Health declaration form"],
    meetingPoint: "Bodrum Diving Center, Gümbet",
    languages: ["English", "Turkish", "German"],
    rating: 4.9,
    reviewCount: 178,
    isFeatured: true,
    isActive: true,
  },
  {
    id: "act-3",
    name: "Ephesus Day Tour",
    slug: "ephesus-day-tour",
    shortDescription: "Explore the ancient city of Ephesus with an expert archaeologist guide.",
    description: "Step back in time on this extraordinary journey to Ephesus, one of the best-preserved ancient cities in the world. Your expert archaeologist guide will bring history to life as you walk the marble streets once trodden by Romans, Greeks, and early Christians.\n\nExplore the magnificent Library of Celsus, one of the most photographed ancient structures in the world. Visit the Grand Theatre where St. Paul once preached to thousands. Walk along the Harbor Street and imagine the bustling port city at its peak.\n\nYour tour includes a visit to the House of Virgin Mary, a peaceful pilgrimage site where the mother of Jesus is believed to have spent her final years. You'll also explore the Temple of Artemis site, one of the Seven Wonders of the Ancient World.\n\nA traditional Turkish lunch is included at a local restaurant, giving you a taste of authentic Aegean cuisine.",
    images: [
      "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=800&q=80",
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
    ],
    thumbnail: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600&q=80",
    categoryId: "cat-3",
    categoryName: "Historical Tours",
    price: 120,
    originalPrice: 150,
    currency: "USD",
    duration: "12 hours",
    durationMinutes: 720,
    location: "Ephesus, Selçuk",
    maxParticipants: 20,
    minParticipants: 4,
    included: ["Archaeologist guide", "Entrance fees", "Lunch", "Air-conditioned transport", "Hotel transfer"],
    excluded: ["Personal expenses", "Tips", "Drinks"],
    highlights: ["Library of Celsus", "Grand Theatre", "House of Virgin Mary", "Temple of Artemis site", "Traditional Turkish lunch"],
    requirements: ["Comfortable walking shoes", "Hat & sunscreen", "Camera"],
    meetingPoint: "Hotel pickup",
    languages: ["English", "Turkish", "German", "Russian"],
    rating: 4.9,
    reviewCount: 521,
    isFeatured: true,
    isActive: true,
  },
  {
    id: "act-4",
    name: "Sunset Sailing Cruise",
    slug: "sunset-sailing-cruise",
    shortDescription: "Romantic sunset cruise with dinner and live music.",
    description: "Experience the magic of a Bodrum sunset from the deck of our luxury sailing yacht. This romantic evening cruise is perfect for couples, special celebrations, or anyone seeking a peaceful escape on the water.\n\nAs the sun begins its descent, you'll set sail from Bodrum Harbor, cruising along the coastline while enjoying welcome drinks and canapés. Watch as the sky transforms into a canvas of oranges, pinks, and purples – the famous Bodrum sunset is truly spectacular.\n\nAfter sunset, enjoy a gourmet dinner prepared by our onboard chef, featuring fresh seafood and local specialties. Live acoustic music creates the perfect atmosphere as you dine under the stars.\n\nThis intimate cruise accommodates only 20 guests, ensuring a personal and exclusive experience.",
    images: [
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    ],
    thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80",
    categoryId: "cat-5",
    categoryName: "Sunset Cruises",
    price: 85,
    currency: "USD",
    duration: "4 hours",
    durationMinutes: 240,
    location: "Bodrum Marina",
    maxParticipants: 20,
    minParticipants: 6,
    included: ["Welcome drinks", "Gourmet dinner", "Live music", "Insurance"],
    excluded: ["Alcoholic beverages (available for purchase)", "Tips", "Hotel transfer"],
    highlights: ["Spectacular sunset views", "Gourmet seafood dinner", "Live acoustic music", "Luxury sailing yacht", "Intimate atmosphere"],
    requirements: ["Smart casual dress code", "Jacket recommended for cool evenings"],
    meetingPoint: "Bodrum Marina, D-Marin",
    languages: ["English", "Turkish"],
    rating: 4.7,
    reviewCount: 156,
    isFeatured: true,
    isActive: true,
  },
  {
    id: "act-5",
    name: "Quad Safari Adventure",
    slug: "quad-safari-adventure",
    shortDescription: "Thrilling ATV ride through mountain trails with panoramic views.",
    description: "Get your adrenaline pumping on this exciting quad safari through the stunning Bodrum countryside. This off-road adventure takes you on a thrilling journey through mountain trails, pine forests, and traditional Turkish villages.\n\nNo experience is necessary – our professional guides will provide full training and safety briefing before you set off. You'll ride modern, well-maintained ATVs on carefully selected trails suitable for all skill levels.\n\nAlong the way, you'll stop at scenic viewpoints offering panoramic views of the Aegean Sea, visit a traditional village to experience authentic rural life, and cool off with a refreshing swim in a natural spring.\n\nThe tour includes all safety equipment, water, and light snacks. It's an adventure you won't forget!",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
    ],
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    categoryId: "cat-4",
    categoryName: "Adventure",
    price: 55,
    currency: "USD",
    duration: "3 hours",
    durationMinutes: 180,
    location: "Bodrum Hills",
    maxParticipants: 15,
    minParticipants: 2,
    included: ["Quad bike", "Safety equipment", "Professional guide", "Training", "Water & snacks", "Insurance"],
    excluded: ["Hotel transfer", "Tips", "Photos"],
    highlights: ["Off-road adventure", "Panoramic sea views", "Visit traditional village", "Natural spring swim", "No experience needed"],
    requirements: ["Valid driving license", "Minimum age 16 years", "Closed shoes required", "Comfortable clothes"],
    meetingPoint: "Quad Safari Base, Torba",
    languages: ["English", "Turkish", "German"],
    rating: 4.6,
    reviewCount: 234,
    isFeatured: false,
    isActive: true,
  },
  {
    id: "act-6",
    name: "Turkish Bath Experience",
    slug: "turkish-bath-experience",
    shortDescription: "Traditional hammam experience with massage and relaxation.",
    description: "Indulge in an authentic Turkish bath experience at one of Bodrum's most beautiful historic hammams. This centuries-old tradition combines cleansing, relaxation, and rejuvenation in a truly unique way.\n\nYour experience begins in the warm room, where you'll relax and prepare your body for the treatment. Move to the hot steam room where the humidity opens your pores and softens your skin.\n\nNext comes the traditional foam massage – lying on the heated marble stone, you'll be covered in luxurious soap foam and receive a vigorous but relaxing scrub with a traditional kese mitt. This exfoliation removes dead skin cells and leaves your skin incredibly soft and smooth.\n\nFinish with a full body oil massage to complete your relaxation journey. You'll leave feeling completely refreshed, renewed, and revitalized.\n\nThe hammam provides all necessary items including towels, slippers, and toiletries.",
    images: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
    ],
    thumbnail: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80",
    categoryId: "cat-4",
    categoryName: "Adventure",
    price: 45,
    currency: "USD",
    duration: "2 hours",
    durationMinutes: 120,
    location: "Bodrum Old Town",
    maxParticipants: 50,
    minParticipants: 1,
    included: ["Full hammam experience", "Foam massage", "Body scrub", "Oil massage", "Towels & toiletries", "Tea"],
    excluded: ["Hotel transfer", "Tips", "Additional treatments"],
    highlights: ["Historic 500-year-old hammam", "Traditional foam massage", "Body exfoliation", "Relaxation massage", "Authentic experience"],
    requirements: ["Swimwear required", "Not suitable during pregnancy"],
    meetingPoint: "Bodrum Hammam, Old Town",
    languages: ["English", "Turkish", "Russian"],
    rating: 4.8,
    reviewCount: 412,
    isFeatured: true,
    isActive: true,
  },
];

function generateSlots(activityId: string, date: string, price: number): AvailabilitySlot[] {
  const times = ["09:00", "10:30", "13:00", "14:30", "16:00"];
  return times.slice(0, Math.floor(Math.random() * 3) + 2).map((time, i) => ({
    id: `slot-${activityId}-${date}-${i}`,
    activityId,
    date,
    time,
    availableSpots: Math.floor(Math.random() * 15) + 5,
    totalSpots: 20,
    price,
    currency: "USD",
  }));
}

function generateTrackingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface IStorage {
  getAgencyInfo(): Promise<AgencyInfo>;
  getCategories(): Promise<ActivityCategory[]>;
  getActivities(featured?: boolean): Promise<Activity[]>;
  getActivityBySlug(slug: string): Promise<Activity | undefined>;
  getAvailability(activitySlug: string, date: string): Promise<AvailabilitySlot[]>;
  createReservation(data: CreateReservation): Promise<Reservation>;
  getReservationByCode(code: string): Promise<Reservation | undefined>;
  saveContactMessage(data: ContactForm): Promise<void>;
}

export class MemStorage implements IStorage {
  private reservations: Map<string, Reservation>;
  private contactMessages: ContactForm[];

  constructor() {
    this.reservations = new Map();
    this.contactMessages = [];
  }

  async getAgencyInfo(): Promise<AgencyInfo> {
    return mockAgency;
  }

  async getCategories(): Promise<ActivityCategory[]> {
    return mockCategories;
  }

  async getActivities(featured?: boolean): Promise<Activity[]> {
    if (featured) {
      return mockActivities.filter((a) => a.isFeatured && a.isActive);
    }
    return mockActivities.filter((a) => a.isActive);
  }

  async getActivityBySlug(slug: string): Promise<Activity | undefined> {
    return mockActivities.find((a) => a.slug === slug);
  }

  async getAvailability(activitySlug: string, date: string): Promise<AvailabilitySlot[]> {
    const activity = await this.getActivityBySlug(activitySlug);
    if (!activity) return [];
    return generateSlots(activity.id, date, activity.price);
  }

  async createReservation(data: CreateReservation): Promise<Reservation> {
    const activity = mockActivities.find((a) => a.id === data.activityId);
    if (!activity) {
      throw new Error("Activity not found");
    }

    const reservation: Reservation = {
      id: randomUUID(),
      trackingCode: generateTrackingCode(),
      activityId: data.activityId,
      activityName: activity.name,
      slotId: data.slotId,
      date: data.date,
      time: data.time,
      participants: data.participants,
      participantCount: data.participants.length,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      notes: data.notes,
      totalPrice: activity.price * data.participants.length,
      currency: activity.currency,
      status: "confirmed",
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    };

    this.reservations.set(reservation.trackingCode, reservation);
    return reservation;
  }

  async getReservationByCode(code: string): Promise<Reservation | undefined> {
    return this.reservations.get(code.toUpperCase());
  }

  async saveContactMessage(data: ContactForm): Promise<void> {
    this.contactMessages.push(data);
  }
}

export const storage = new MemStorage();
