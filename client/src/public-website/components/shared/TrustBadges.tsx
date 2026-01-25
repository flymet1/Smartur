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

const bgColors = [
  "bg-blue-50 dark:bg-blue-950/30",
  "bg-emerald-50 dark:bg-emerald-950/30",
  "bg-amber-50 dark:bg-amber-950/30",
  "bg-indigo-50 dark:bg-indigo-950/30",
];

const iconColors = [
  "text-blue-500",
  "text-emerald-500",
  "text-amber-500",
  "text-indigo-500",
];

export function TrustBadges({ badges = defaultBadges }: TrustBadgesProps) {
  const { t } = useLanguage();
  
  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {badges.map((badge, index) => {
            const IconComponent = iconMap[badge.icon?.toLowerCase() || "shield"] || Shield;
            const bgColor = bgColors[index % bgColors.length];
            const iconColor = iconColors[index % iconColors.length];
            return (
              <div 
                key={index} 
                className={`${bgColor} rounded-xl p-4 flex items-center justify-between gap-3 transition-all hover:shadow-md`}
                data-testid={`trust-badge-${index}`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{badge.title}</h3>
                  {badge.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{badge.description}</p>
                  )}
                </div>
                <div className={`flex-shrink-0 ${iconColor}`}>
                  <IconComponent className="w-8 h-8 opacity-80" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
