import Iyzipay from "iyzipay";
import { db } from "./db";
import { tenants, reservations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "./encryption";

export interface PaymentRequest {
  tenantId: number;
  reservationId: number;
  price: number;
  paidPrice: number;
  currency: "TRY" | "USD" | "EUR";
  installment?: number;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    gsmNumber?: string;
    identityNumber?: string;
    ip: string;
    city?: string;
    country?: string;
    address?: string;
    zipCode?: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    price: string;
    itemType: "PHYSICAL" | "VIRTUAL";
  }>;
  callbackUrl: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  paymentPageUrl?: string;
  token?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface PaymentCallbackData {
  token: string;
  status: string;
  paymentId?: string;
  conversationId?: string;
  mdStatus?: string;
  [key: string]: any;
}

export interface PaymentProvider {
  name: string;
  initializeCheckout(request: PaymentRequest): Promise<PaymentResult>;
  handleCallback(data: PaymentCallbackData): Promise<PaymentResult>;
  retrievePayment(paymentId: string, conversationId?: string): Promise<PaymentResult>;
}

class IyzicoProvider implements PaymentProvider {
  name = "iyzico";
  private iyzipay: Iyzipay | null = null;
  private apiKey: string;
  private secretKey: string;
  private isTestMode: boolean;

  constructor(apiKey: string, secretKey: string, isTestMode: boolean = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.isTestMode = isTestMode;
    
    this.iyzipay = new Iyzipay({
      apiKey: this.apiKey,
      secretKey: this.secretKey,
      uri: isTestMode 
        ? "https://sandbox-api.iyzipay.com" 
        : "https://api.iyzipay.com"
    });
  }

  async initializeCheckout(request: PaymentRequest): Promise<PaymentResult> {
    if (!this.iyzipay) {
      return { success: false, errorMessage: "iyzico yapılandırılmamış" };
    }

    const conversationId = `RES-${request.reservationId}-${Date.now()}`;
    
    const iyzicoRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: request.price.toString(),
      paidPrice: request.paidPrice.toString(),
      currency: request.currency === "TRY" ? Iyzipay.CURRENCY.TRY : 
                request.currency === "USD" ? Iyzipay.CURRENCY.USD : 
                Iyzipay.CURRENCY.EUR,
      basketId: `BASKET-${request.reservationId}`,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: request.callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: request.buyer.id,
        name: request.buyer.name,
        surname: request.buyer.surname,
        gsmNumber: request.buyer.gsmNumber || "+905000000000",
        email: request.buyer.email,
        identityNumber: request.buyer.identityNumber || "11111111111",
        lastLoginDate: new Date().toISOString().slice(0, 19).replace("T", " "),
        registrationDate: new Date().toISOString().slice(0, 19).replace("T", " "),
        registrationAddress: request.buyer.address || "Türkiye",
        ip: request.buyer.ip,
        city: request.buyer.city || "Istanbul",
        country: request.buyer.country || "Turkey",
        zipCode: request.buyer.zipCode || "34000"
      },
      shippingAddress: {
        contactName: `${request.buyer.name} ${request.buyer.surname}`,
        city: request.buyer.city || "Istanbul",
        country: request.buyer.country || "Turkey",
        address: request.buyer.address || "Türkiye",
        zipCode: request.buyer.zipCode || "34000"
      },
      billingAddress: {
        contactName: `${request.buyer.name} ${request.buyer.surname}`,
        city: request.buyer.city || "Istanbul",
        country: request.buyer.country || "Turkey",
        address: request.buyer.address || "Türkiye",
        zipCode: request.buyer.zipCode || "34000"
      },
      basketItems: request.basketItems.map(item => ({
        id: item.id,
        name: item.name,
        category1: item.category1,
        itemType: item.itemType === "PHYSICAL" ? Iyzipay.BASKET_ITEM_TYPE.PHYSICAL : Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
        price: item.price
      }))
    };

    return new Promise((resolve) => {
      this.iyzipay!.checkoutFormInitialize.create(iyzicoRequest as any, (err: any, result: any) => {
        if (err) {
          console.error("iyzico checkout error:", err);
          resolve({ 
            success: false, 
            errorMessage: err.message || "Ödeme başlatılamadı",
            rawResponse: err 
          });
          return;
        }

        if (result.status === "success") {
          resolve({
            success: true,
            token: result.token,
            paymentPageUrl: result.paymentPageUrl,
            rawResponse: result
          });
        } else {
          resolve({
            success: false,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage || "Ödeme başlatılamadı",
            rawResponse: result
          });
        }
      });
    });
  }

  async handleCallback(data: PaymentCallbackData): Promise<PaymentResult> {
    if (!this.iyzipay) {
      return { success: false, errorMessage: "iyzico yapılandırılmamış" };
    }

    return new Promise((resolve) => {
      this.iyzipay!.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: data.conversationId || "",
        token: data.token
      } as any, (err: any, result: any) => {
        if (err) {
          console.error("iyzico callback error:", err);
          resolve({ 
            success: false, 
            errorMessage: err.message || "Ödeme doğrulanamadı",
            rawResponse: err 
          });
          return;
        }

        if (result.status === "success" && result.paymentStatus === "SUCCESS") {
          resolve({
            success: true,
            paymentId: result.paymentId,
            rawResponse: result
          });
        } else {
          resolve({
            success: false,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage || "Ödeme başarısız",
            rawResponse: result
          });
        }
      });
    });
  }

  async retrievePayment(paymentId: string, conversationId?: string): Promise<PaymentResult> {
    if (!this.iyzipay) {
      return { success: false, errorMessage: "iyzico yapılandırılmamış" };
    }

    return new Promise((resolve) => {
      this.iyzipay!.payment.retrieve({
        locale: Iyzipay.LOCALE.TR,
        conversationId: conversationId || "",
        paymentId
      } as any, (err: any, result: any) => {
        if (err) {
          resolve({ 
            success: false, 
            errorMessage: err.message,
            rawResponse: err 
          });
          return;
        }

        resolve({
          success: result.status === "success",
          paymentId: result.paymentId,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          rawResponse: result
        });
      });
    });
  }
}

export class PaymentService {
  private static providerCache: Map<number, PaymentProvider> = new Map();

  static async getProviderForTenant(tenantId: number): Promise<PaymentProvider | null> {
    if (this.providerCache.has(tenantId)) {
      return this.providerCache.get(tenantId)!;
    }

    const [tenant] = await db
      .select({
        websitePaymentProvider: tenants.websitePaymentProvider,
        websitePaymentApiKey: tenants.websitePaymentApiKey,
        websitePaymentSecretKey: tenants.websitePaymentSecretKey,
        websitePaymentTestMode: tenants.websitePaymentTestMode,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant || !tenant.websitePaymentProvider || !tenant.websitePaymentApiKey || !tenant.websitePaymentSecretKey) {
      return null;
    }

    let provider: PaymentProvider | null = null;

    try {
      const apiKey = decrypt(tenant.websitePaymentApiKey);
      const secretKey = decrypt(tenant.websitePaymentSecretKey);
      const isTestMode = tenant.websitePaymentTestMode === true;

      switch (tenant.websitePaymentProvider) {
        case "iyzico":
          provider = new IyzicoProvider(apiKey, secretKey, isTestMode);
          break;
        default:
          console.warn(`Unknown payment provider: ${tenant.websitePaymentProvider}`);
          return null;
      }

      this.providerCache.set(tenantId, provider);
      return provider;
    } catch (error) {
      console.error("Error creating payment provider:", error);
      return null;
    }
  }

  static clearProviderCache(tenantId?: number) {
    if (tenantId) {
      this.providerCache.delete(tenantId);
    } else {
      this.providerCache.clear();
    }
  }

  static async initializePayment(request: PaymentRequest): Promise<PaymentResult> {
    const provider = await this.getProviderForTenant(request.tenantId);
    if (!provider) {
      return { success: false, errorMessage: "Ödeme sağlayıcısı yapılandırılmamış" };
    }

    return provider.initializeCheckout(request);
  }

  static async handleCallback(tenantId: number, data: PaymentCallbackData): Promise<PaymentResult> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return { success: false, errorMessage: "Ödeme sağlayıcısı yapılandırılmamış" };
    }

    return provider.handleCallback(data);
  }
}
