import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useSearch, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Users,
  CreditCard,
  User,
  Clock,
  MapPin,
  PartyPopper,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createReservationSchema, type Activity, type AvailabilitySlot, type Reservation } from "@shared/schema";
import { z } from "zod";

const steps = [
  { id: "date", icon: Calendar },
  { id: "participants", icon: Users },
  { id: "contact", icon: User },
  { id: "confirm", icon: Check },
];

const participantSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  age: z.number().optional(),
});

const reservationFormSchema = z.object({
  participants: z.array(participantSchema).min(1),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(5),
  notes: z.string().optional(),
});

type ReservationFormData = z.infer<typeof reservationFormSchema>;

export default function ReservationPage() {
  const { t } = useTranslation();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(searchParams);
  const dateStr = urlParams.get("date") || "";
  const slotId = urlParams.get("slot") || "";
  const participantCount = parseInt(urlParams.get("participants") || "1", 10);

  const [currentStep, setCurrentStep] = useState(1);
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const { data: activity, isLoading: activityLoading } = useQuery<Activity>({
    queryKey: ["/api/activities", params.slug],
  });

  const { data: slots } = useQuery<AvailabilitySlot[]>({
    queryKey: ["/api/availability", params.slug, dateStr],
    enabled: !!dateStr,
  });

  const selectedSlot = slots?.find((s) => s.id === slotId);

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      participants: Array.from({ length: participantCount }, () => ({
        name: "",
        email: "",
        phone: "",
      })),
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      notes: "",
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: ReservationFormData) => {
      const reservationData = {
        activityId: activity!.id,
        slotId: slotId,
        date: dateStr,
        time: selectedSlot?.time || "",
        participants: data.participants.map((p) => ({
          name: p.name,
          email: p.email || undefined,
          phone: p.phone || undefined,
          age: p.age,
        })),
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        notes: data.notes || undefined,
      };
      const res = await apiRequest("POST", "/api/reservations", reservationData);
      return res.json();
    },
    onSuccess: (data: Reservation) => {
      setReservation(data);
      setCurrentStep(4);
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const participantsValid = await form.trigger("participants");
      if (participantsValid) {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      const contactValid = await form.trigger(["contactName", "contactEmail", "contactPhone"]);
      if (contactValid) {
        form.handleSubmit((data) => createReservationMutation.mutate(data))();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (activityLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("activities.noResults")}</p>
      </div>
    );
  }

  const totalPrice = (selectedSlot?.price || activity.price) * participantCount;

  if (reservation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
              <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2" data-testid="text-success-title">
              {t("reservation.success")}
            </h1>
            <p className="text-muted-foreground mb-6">{t("reservation.successMessage")}</p>

            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">{t("reservation.trackingCode")}</p>
              <p className="text-2xl font-mono font-bold" data-testid="text-tracking-code">
                {reservation.trackingCode}
              </p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("reservation.activity")}</span>
                <span className="font-medium">{reservation.activityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("reservation.date")}</span>
                <span className="font-medium">{reservation.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("reservation.time")}</span>
                <span className="font-medium">{reservation.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("activityDetail.participants")}</span>
                <span className="font-medium">{reservation.participantCount}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="font-medium">{t("reservation.total")}</span>
                <span className="font-bold text-primary">
                  {reservation.currency} {reservation.totalPrice}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setLocation("/track")} data-testid="button-track">
                {t("nav.trackReservation")}
              </Button>
              <Button className="flex-1" onClick={() => setLocation("/")} data-testid="button-go-home">
                {t("reservation.goHome")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${t("reservation.title")} - ${activity.name}`} description={activity.shortDescription} />
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold" data-testid="text-reservation-title">
            {t("reservation.title")}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors ${
                  index + 1 < currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : index + 1 === currentStep
                    ? "border-primary text-primary"
                    : "border-muted text-muted-foreground"
                }`}
                data-testid={`step-${step.id}`}
              >
                {index + 1 < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 md:w-24 h-0.5 mx-2 transition-colors ${
                    index + 1 < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form>
                {currentStep === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {t("reservation.stepDate")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("reservation.date")}</Label>
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium" data-testid="text-selected-date">{dateStr || "-"}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("reservation.time")}</Label>
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium" data-testid="text-selected-time">
                              {selectedSlot?.time || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("activityDetail.participants")}</Label>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium" data-testid="text-participant-count">
                            {participantCount} {t("activityDetail.participants")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentStep === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {t("reservation.participantInfo")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {fields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4">
                          <h4 className="font-medium">
                            {t("reservation.participant")} {index + 1}
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`participants.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("reservation.name")}</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid={`input-participant-${index}-name`} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`participants.${index}.age`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("reservation.age")}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                      data-testid={`input-participant-${index}-age`}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {currentStep === 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {t("reservation.contactInfo")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("reservation.name")}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-contact-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("reservation.email")}</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} data-testid="input-contact-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("reservation.phone")}</FormLabel>
                              <FormControl>
                                <Input type="tel" {...field} data-testid="input-contact-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("reservation.notes")}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t("reservation.notesPlaceholder")}
                                {...field}
                                data-testid="input-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    data-testid="button-back"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {t("reservation.back")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={createReservationMutation.isPending}
                    data-testid="button-next"
                  >
                    {currentStep === 3 ? (
                      <>
                        {createReservationMutation.isPending ? t("common.loading") : t("reservation.confirm")}
                        <Check className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        {t("reservation.next")}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="lg:sticky lg:top-24 self-start">
            <Card>
              <CardHeader>
                <CardTitle>{t("reservation.summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden mb-4">
                  <img
                    src={activity.thumbnail}
                    alt={activity.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="font-semibold">{activity.name}</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{selectedSlot?.time || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{participantCount} {t("activityDetail.participants")}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {activity.currency} {selectedSlot?.price || activity.price} x {participantCount}
                    </span>
                    <span>
                      {activity.currency} {totalPrice}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>{t("reservation.total")}</span>
                    <span className="text-primary" data-testid="text-summary-total">
                      {activity.currency} {totalPrice}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
