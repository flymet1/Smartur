export type ErrorType = 
  | 'license_limit' 
  | 'validation' 
  | 'network' 
  | 'auth' 
  | 'not_found' 
  | 'conflict' 
  | 'server' 
  | 'unknown';

export interface ParsedError {
  type: ErrorType;
  message: string;
  title: string;
  suggestion?: string;
  field?: string;
  details?: Record<string, string>;
  statusCode?: number;
}

const ERROR_MESSAGES: Record<number, { title: string; message: string; suggestion?: string }> = {
  400: {
    title: 'Geçersiz İstek',
    message: 'Gönderilen bilgilerde bir hata var.',
    suggestion: 'Lütfen formu kontrol edip tekrar deneyin.'
  },
  401: {
    title: 'Oturum Sonlandı',
    message: 'Oturumunuz sona ermiş.',
    suggestion: 'Lütfen tekrar giriş yapın.'
  },
  403: {
    title: 'Erişim Engellendi',
    message: 'Bu işlemi yapmaya yetkiniz yok.',
    suggestion: 'Yetki için yöneticinizle iletişime geçin.'
  },
  404: {
    title: 'Bulunamadı',
    message: 'Aradığınız kayıt bulunamadı.',
    suggestion: 'Sayfa yenilendiğinde kayıt silinmiş olabilir.'
  },
  409: {
    title: 'Çakışma',
    message: 'Bu işlem mevcut bir kayıtla çakışıyor.',
    suggestion: 'Lütfen bilgileri kontrol edip tekrar deneyin.'
  },
  429: {
    title: 'Limit Aşıldı',
    message: 'Çok fazla istek gönderdiniz.',
    suggestion: 'Lütfen bir süre bekleyip tekrar deneyin.'
  },
  500: {
    title: 'Sunucu Hatası',
    message: 'Sunucuda beklenmeyen bir hata oluştu.',
    suggestion: 'Lütfen daha sonra tekrar deneyin veya destek ekibiyle iletişime geçin.'
  },
  502: {
    title: 'Bağlantı Hatası',
    message: 'Sunucuya ulaşılamıyor.',
    suggestion: 'Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
  },
  503: {
    title: 'Servis Kullanım Dışı',
    message: 'Sistem geçici olarak kullanım dışı.',
    suggestion: 'Lütfen bir süre bekleyip tekrar deneyin.'
  }
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Ad',
  email: 'E-posta',
  phone: 'Telefon',
  password: 'Şifre',
  customerName: 'Müşteri Adı',
  customerPhone: 'Müşteri Telefonu',
  customerEmail: 'Müşteri E-postası',
  date: 'Tarih',
  time: 'Saat',
  activityId: 'Aktivite',
  numberOfPeople: 'Kişi Sayısı',
  price: 'Fiyat',
  priceUsd: 'USD Fiyat',
  durationMinutes: 'Süre',
  dailyFrequency: 'Günlük Seans',
  defaultCapacity: 'Kapasite',
  description: 'Açıklama',
  username: 'Kullanıcı Adı',
  companyName: 'Şirket Adı',
};

export function parseError(error: unknown): ParsedError {
  if (error instanceof Error) {
    const match = error.message.match(/^(\d+):\s*(.+)$/);
    if (match) {
      const statusCode = parseInt(match[1]);
      const body = match[2];
      
      let errorData: { error?: string; message?: string; field?: string; licenseStatus?: string; limitType?: string } = {};
      try {
        errorData = JSON.parse(body);
      } catch {
        errorData = { error: body };
      }
      
      if (errorData.licenseStatus || errorData.limitType) {
        return {
          type: 'license_limit',
          statusCode,
          title: 'Paket Limiti',
          message: errorData.error || 'Paket limitinize ulaştınız.',
          suggestion: 'Daha fazla işlem için paketinizi yükseltebilirsiniz.'
        };
      }
      
      if (statusCode === 401) {
        return {
          type: 'auth',
          statusCode,
          title: ERROR_MESSAGES[401].title,
          message: ERROR_MESSAGES[401].message,
          suggestion: ERROR_MESSAGES[401].suggestion
        };
      }
      
      if (statusCode === 404) {
        return {
          type: 'not_found',
          statusCode,
          title: ERROR_MESSAGES[404].title,
          message: errorData.error || ERROR_MESSAGES[404].message,
          suggestion: ERROR_MESSAGES[404].suggestion
        };
      }
      
      if (statusCode === 409) {
        return {
          type: 'conflict',
          statusCode,
          title: ERROR_MESSAGES[409].title,
          message: errorData.error || ERROR_MESSAGES[409].message,
          suggestion: ERROR_MESSAGES[409].suggestion
        };
      }
      
      if (statusCode === 400) {
        const fieldName = errorData.field;
        const fieldLabel = fieldName ? FIELD_LABELS[fieldName] || fieldName : undefined;
        return {
          type: 'validation',
          statusCode,
          title: ERROR_MESSAGES[400].title,
          message: errorData.error || ERROR_MESSAGES[400].message,
          field: fieldLabel,
          suggestion: fieldLabel 
            ? `"${fieldLabel}" alanini kontrol edin.`
            : ERROR_MESSAGES[400].suggestion
        };
      }
      
      if (statusCode >= 500) {
        const serverError = ERROR_MESSAGES[statusCode] || ERROR_MESSAGES[500];
        return {
          type: 'server',
          statusCode,
          title: serverError.title,
          message: errorData.error || serverError.message,
          suggestion: serverError.suggestion
        };
      }
      
      const genericError = ERROR_MESSAGES[statusCode] || {
        title: 'Hata',
        message: errorData.error || 'Beklenmeyen bir hata olustu.'
      };
      
      return {
        type: 'unknown',
        statusCode,
        title: genericError.title,
        message: genericError.message,
        suggestion: genericError.suggestion
      };
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        type: 'network',
        title: 'Bağlantı Hatası',
        message: 'Sunucuya ulaşılamıyor.',
        suggestion: 'Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
      };
    }
    
    return {
      type: 'unknown',
      title: 'Hata',
      message: error.message || 'Beklenmeyen bir hata oluştu.',
      suggestion: 'Lütfen tekrar deneyin.'
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    return {
      type: 'unknown',
      title: 'Hata',
      message: (errorObj.error as string) || (errorObj.message as string) || 'Beklenmeyen bir hata oluştu.',
      suggestion: 'Lütfen tekrar deneyin.'
    };
  }
  
  return {
    type: 'unknown',
    title: 'Hata',
    message: 'Beklenmeyen bir hata oluştu.',
    suggestion: 'Lütfen tekrar deneyin.'
  };
}

export function getErrorToastMessage(error: unknown): { title: string; description: string } {
  const parsed = parseError(error);
  const description = parsed.suggestion 
    ? `${parsed.message} ${parsed.suggestion}` 
    : parsed.message;
  return { title: parsed.title, description };
}

export function getFieldError(fieldName: string, validationErrors?: Record<string, string[]>): string | undefined {
  if (!validationErrors) return undefined;
  const errors = validationErrors[fieldName];
  return errors?.[0];
}

export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages: string[] = [];
  for (const [field, fieldErrors] of Object.entries(errors)) {
    const label = FIELD_LABELS[field] || field;
    messages.push(`${label}: ${fieldErrors[0]}`);
  }
  return messages.join('\n');
}

export function isLicenseError(error: unknown): boolean {
  const parsed = parseError(error);
  return parsed.type === 'license_limit';
}

export function isAuthError(error: unknown): boolean {
  const parsed = parseError(error);
  return parsed.type === 'auth';
}
