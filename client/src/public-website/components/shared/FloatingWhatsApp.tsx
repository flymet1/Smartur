import { SiWhatsapp } from "react-icons/si";

interface FloatingWhatsAppProps {
  phoneNumber?: string | null;
}

export function FloatingWhatsApp({ phoneNumber }: FloatingWhatsAppProps) {
  if (!phoneNumber) return null;

  const cleanNumber = phoneNumber.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110"
      aria-label="WhatsApp"
      data-testid="link-whatsapp-floating"
    >
      <SiWhatsapp className="w-7 h-7" />
    </a>
  );
}
