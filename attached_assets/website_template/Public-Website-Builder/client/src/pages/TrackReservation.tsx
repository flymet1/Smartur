import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Reservation } from "@shared/schema";

const statusConfig = {
  pending: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: AlertCircle },
  confirmed: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  cancelled: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  completed: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: CheckCircle2 },
};

const paymentStatusConfig = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  refunded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function TrackReservation() {
  const { t } = useTranslation();
  const [trackingCode, setTrackingCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const { data: reservation, isLoading, isError } = useQuery<Reservation>({
    queryKey: [`/api/reservations/${searchCode}`],
    enabled: !!searchCode,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      setSearchCode(trackingCode.trim().toUpperCase());
    }
  };

  const StatusIcon = reservation ? statusConfig[reservation.status].icon : AlertCircle;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={t("tracking.title")} description={t("tracking.subtitle")} />
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-track-title">
            {t("tracking.title")}
          </h1>
          <p className="text-muted-foreground">{t("tracking.subtitle")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("tracking.placeholder")}
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="pl-10 font-mono uppercase"
                data-testid="input-tracking-code"
              />
            </div>
            <Button type="submit" disabled={!trackingCode.trim()} data-testid="button-search">
              {t("tracking.search")}
            </Button>
          </form>

          {isLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
              </CardContent>
            </Card>
          )}

          {isError && searchCode && (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("tracking.notFound")}</p>
                <p className="text-muted-foreground mt-2">
                  Code: {searchCode}
                </p>
              </CardContent>
            </Card>
          )}

          {reservation && (
            <Card data-testid="card-reservation-result">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <StatusIcon className={`h-6 w-6 ${statusConfig[reservation.status].color.split(" ")[1]}`} />
                    {reservation.activityName}
                  </CardTitle>
                  <Badge className={statusConfig[reservation.status].color}>
                    {t(`tracking.status.${reservation.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">{t("reservation.trackingCode")}</p>
                  <p className="text-2xl font-mono font-bold" data-testid="text-result-tracking-code">
                    {reservation.trackingCode}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("reservation.date")}</p>
                      <p className="font-medium" data-testid="text-result-date">{reservation.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("reservation.time")}</p>
                      <p className="font-medium" data-testid="text-result-time">{reservation.time}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("activityDetail.participants")}</p>
                      <p className="font-medium" data-testid="text-result-participants">
                        {reservation.participantCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("tracking.paymentStatus.pending").split(" ")[0]}</p>
                      <Badge className={paymentStatusConfig[reservation.paymentStatus]}>
                        {t(`tracking.paymentStatus.${reservation.paymentStatus}`)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">{t("reservation.contactInfo")}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("reservation.name")}</span>
                      <span>{reservation.contactName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("reservation.email")}</span>
                      <span>{reservation.contactEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("reservation.phone")}</span>
                      <span>{reservation.contactPhone}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">{t("reservation.participantInfo")}</h4>
                  <div className="space-y-2">
                    {reservation.participants.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{i + 1}</Badge>
                        <span>{p.name}</span>
                        {p.age && <span className="text-muted-foreground">({p.age} years)</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{t("reservation.total")}</span>
                    <span className="text-2xl font-bold text-primary" data-testid="text-result-total">
                      {reservation.currency} {reservation.totalPrice}
                    </span>
                  </div>
                </div>

                {reservation.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">{t("reservation.notes")}</h4>
                    <p className="text-sm text-muted-foreground">{reservation.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
