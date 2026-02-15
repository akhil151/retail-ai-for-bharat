import { z } from 'zod';
import type { Product, Upload } from './schema';
import { insertProductSchema } from './schema';

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
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.custom<Product>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.custom<Product>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.custom<Product>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<Product>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  sales: {
    analytics: {
      method: 'GET' as const,
      path: '/api/sales/analytics' as const,
      responses: {
        200: z.custom<{
          totalRevenue: number;
          totalUnits: number;
          salesByProduct: { productId: number; name: string; revenue: number; units: number }[];
          salesByDate: { date: string; revenue: number }[];
        }>(),
      },
    },
  },
  uploads: {
    list: {
      method: 'GET' as const,
      path: '/api/uploads' as const,
      responses: {
        200: z.array(z.custom<Upload>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/uploads' as const,
      // Input is multipart/form-data, not validated here by Zod in the same way
      responses: {
        201: z.custom<Upload>(),
        400: errorSchemas.validation,
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
