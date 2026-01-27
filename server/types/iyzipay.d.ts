declare module 'iyzipay' {
  interface IyzipayOptions {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  interface CheckoutFormInitializeRequest {
    locale: string;
    conversationId: string;
    price: string;
    paidPrice: string;
    currency: string;
    basketId: string;
    paymentGroup: string;
    callbackUrl: string;
    enabledInstallments: number[];
    buyer: any;
    shippingAddress: any;
    billingAddress: any;
    basketItems: any[];
  }

  interface CheckoutFormRetrieveRequest {
    locale: string;
    conversationId: string;
    token: string;
  }

  interface PaymentRetrieveRequest {
    locale: string;
    conversationId: string;
    paymentId: string;
  }

  class Iyzipay {
    constructor(options: IyzipayOptions);
    
    checkoutFormInitialize: {
      create(request: any, callback: (err: any, result: any) => void): void;
    };
    
    checkoutForm: {
      retrieve(request: any, callback: (err: any, result: any) => void): void;
    };
    
    payment: {
      create(request: any, callback: (err: any, result: any) => void): void;
      retrieve(request: any, callback: (err: any, result: any) => void): void;
    };
    
    refund: {
      create(request: any, callback: (err: any, result: any) => void): void;
    };

    static LOCALE: {
      TR: string;
      EN: string;
    };

    static CURRENCY: {
      TRY: string;
      USD: string;
      EUR: string;
      GBP: string;
      IRR: string;
    };

    static PAYMENT_GROUP: {
      PRODUCT: string;
      LISTING: string;
      SUBSCRIPTION: string;
    };

    static PAYMENT_CHANNEL: {
      WEB: string;
      MOBILE: string;
      MOBILE_WEB: string;
      MOBILE_IOS: string;
      MOBILE_ANDROID: string;
    };

    static BASKET_ITEM_TYPE: {
      PHYSICAL: string;
      VIRTUAL: string;
    };
  }

  export = Iyzipay;
}
