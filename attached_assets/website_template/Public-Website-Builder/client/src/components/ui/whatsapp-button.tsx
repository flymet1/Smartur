import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SiWhatsapp } from "react-icons/si";

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
}

export function WhatsAppButton({ phone, message }: WhatsAppButtonProps) {
  const { t } = useTranslation();
  
  const handleClick = () => {
    const url = `https://wa.me/${phone.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
    window.open(url, "_blank");
  };

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20BD5C] shadow-lg z-50"
      size="icon"
      data-testid="button-whatsapp"
    >
      <SiWhatsapp className="h-7 w-7 text-white" />
      <span className="sr-only">{t("contact.whatsapp")}</span>
    </Button>
  );
}
