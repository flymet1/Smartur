import { FaWhatsapp } from "react-icons/fa";

interface WhatsAppButtonProps {
  phoneNumber?: string | null;
  message?: string;
}

export function WhatsAppButton({ phoneNumber, message = "Merhaba! Rezervasyon hakkında bilgi almak istiyorum." }: WhatsAppButtonProps) {
  if (!phoneNumber) return null;

  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 group"
      data-testid="button-whatsapp-float"
    >
      <FaWhatsapp className="w-7 h-7" />
      <span className="absolute right-full mr-3 bg-card text-foreground px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        WhatsApp ile iletişime geçin
      </span>
    </a>
  );
}
