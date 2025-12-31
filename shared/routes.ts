import { z } from 'zod';
import { insertActivitySchema, insertCapacitySchema, insertReservationSchema, activities, capacity, reservations, messages } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  activities: {
    list: {
      method: 'GET' as const,
      path: '/api/activities',
      responses: {
        200: z.array(z.custom<typeof activities.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/activities',
      input: insertActivitySchema,
      responses: {
        201: z.custom<typeof activities.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/activities/:id',
      input: insertActivitySchema.partial(),
      responses: {
        200: z.custom<typeof activities.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/activities/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  capacity: {
    list: {
      method: 'GET' as const,
      path: '/api/capacity',
      input: z.object({
        date: z.string().optional(), // YYYY-MM-DD
        activityId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof capacity.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/capacity',
      input: insertCapacitySchema,
      responses: {
        201: z.custom<typeof capacity.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  reservations: {
    list: {
      method: 'GET' as const,
      path: '/api/reservations',
      responses: {
        200: z.array(z.custom<typeof reservations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/reservations',
      input: insertReservationSchema,
      responses: {
        201: z.custom<typeof reservations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    stats: {
      method: 'GET' as const,
      path: '/api/reservations/stats',
      responses: {
        200: z.object({
          totalReservations: z.number(),
          totalRevenue: z.number(),
          popularActivities: z.array(z.object({ name: z.string(), count: z.number() })),
        }),
      },
    },
  },
  webhooks: {
    woocommerce: {
      method: 'POST' as const,
      path: '/api/webhooks/woocommerce',
      input: z.any(), // Flexible input for WooCommerce payload
      responses: {
        200: z.object({ received: z.boolean() }),
      },
    },
    whatsapp: {
      method: 'POST' as const,
      path: '/api/webhooks/whatsapp',
      input: z.object({
        Body: z.string().optional(),
        From: z.string().optional(),
      }).passthrough(), // Allow other Twilio fields
      responses: {
        200: z.string(), // Twiml response
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
