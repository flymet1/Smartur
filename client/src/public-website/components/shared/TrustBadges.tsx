import { Shield, Award, Clock, Users, Star, ThumbsUp } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

interface TrustBadge {
  icon?: string;
  title: string;
  description?: string;
}

interface TrustBadgesProps {
  badges?: TrustBadge[];
}

const defaultBadges = [
  { icon: "shield", title: "Güvenli Ödeme", description: "256-bit SSL şifreleme" },
  { icon: "award", title: "Lisanslı Operatör", description: "Resmi turizm belgeli" },
  { icon: "clock", title: "7/24 Destek", description: "Her an yanınızdayız" },
  { icon: "users", title: "10K+ Mutlu Müşteri", description: "Memnuniyet garantisi" },
];

const iconMap: Record<string, typeof Shield> = {
  shield: Shield,
  award: Award,
  clock: Clock,
  users: Users,
  star: Star,
  thumbsup: ThumbsUp,
};

export function TrustBadges({ badges = defaultBadges }: TrustBadgesProps) {
  const { t } = useLanguage();
  
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, index) => {
            const IconComponent = iconMap[badge.icon?.toLowerCase() || "shield"] || Shield;
            return (
              <div key={index} className="text-center" data-testid={`trust-badge-${index}`}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{badge.title}</h3>
                {badge.description && (
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
