import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { contactFormSchema, type AgencyInfo, type ContactForm } from "@shared/schema";
import { useState } from "react";

export default function ContactPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: agency } = useQuery<AgencyInfo>({
    queryKey: ["/api/agency"],
  });

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      const res = await apiRequest("POST", "/api/contact", data);
      return res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      form.reset();
      setTimeout(() => setIsSuccess(false), 5000);
    },
    onError: () => {
      toast({
        title: t("common.error"),
        variant: "destructive",
      });
    },
  });

  const handleWhatsApp = () => {
    if (agency?.whatsapp) {
      window.open(`https://wa.me/${agency.whatsapp.replace(/\D/g, "")}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title={t("contact.title")} description={t("contact.subtitle")} />
      <div className="bg-primary/5 border-b">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-contact-title">
            {t("contact.title")}
          </h1>
          <p className="text-muted-foreground">{t("contact.subtitle")}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <div className="space-y-6 mb-8">
              {agency?.address && (
                <Card className="hover-elevate">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{t("contact.info.address")}</h3>
                      <p className="text-muted-foreground">{agency.address}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {agency?.phone && (
                <Card className="hover-elevate">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{t("contact.info.phone")}</h3>
                      <a
                        href={`tel:${agency.phone}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {agency.phone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              {agency?.email && (
                <Card className="hover-elevate">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{t("contact.info.email")}</h3>
                      <a
                        href={`mailto:${agency.email}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {agency.email}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="hover-elevate">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">{t("contact.info.hours")}</h3>
                    <p className="text-muted-foreground">
                      Mon - Sat: 09:00 - 18:00<br />
                      Sunday: Closed
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {agency?.whatsapp && (
              <Button
                onClick={handleWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#20BD5C] text-white gap-2"
                size="lg"
                data-testid="button-whatsapp-contact"
              >
                <SiWhatsapp className="h-5 w-5" />
                {t("contact.whatsapp")}
              </Button>
            )}

            {agency?.mapUrl && (
              <div className="mt-8 rounded-lg overflow-hidden border">
                <iframe
                  src={agency.mapUrl}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Location Map"
                />
              </div>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t("contact.form.send")}</CardTitle>
              </CardHeader>
              <CardContent>
                {isSuccess ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">{t("contact.form.success")}</h3>
                    <p className="text-muted-foreground">We'll get back to you soon.</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((data) => sendMessageMutation.mutate(data))}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.name")}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-contact-form-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("contact.form.email")}</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} data-testid="input-contact-form-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("contact.form.phone")}</FormLabel>
                              <FormControl>
                                <Input type="tel" {...field} data-testid="input-contact-form-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.subject")}</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-contact-form-subject" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("contact.form.message")}</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={5}
                                {...field}
                                data-testid="input-contact-form-message"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full gap-2"
                        size="lg"
                        disabled={sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                        {sendMessageMutation.isPending ? t("common.loading") : t("contact.form.send")}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
