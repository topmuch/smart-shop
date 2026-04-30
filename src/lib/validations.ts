import { z } from "zod";

/** Schema for scanning a product */
export const scanProductSchema = z.object({
  sessionId: z.string().cuid("sessionId must be a valid CUID"),
  barcode: z.string().min(1, "Barcode is required"),
  productName: z.string().min(1, "Product name is required"),
  price: z.number().int().positive("Price must be a positive number (in cents)"),
  category: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional().default(1),
});

/** Schema for creating a shopping session */
export const createSessionSchema = z.object({
  budgetLimit: z
    .number()
    .int()
    .positive("Budget limit must be a positive number (in cents)")
    .optional()
    .default(10000),
  listId: z.string().optional(),
  location: z.string().optional(),
});

/** Schema for creating a shopping list */
export const createListSchema = z.object({
  name: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      checked: z.boolean(),
      quantity: z.number(),
    })
  ).optional(),
});

/** Schema for updating a shopping list */
export const updateListSchema = z.object({
  name: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        category: z.string(),
        checked: z.boolean(),
        quantity: z.number(),
      })
    )
    .optional(),
  isDefault: z.boolean().optional(),
});

/** Schema for finishing a session */
export const finishSessionSchema = z.object({
  sessionId: z.string().cuid("sessionId must be a valid CUID"),
});

/** Schema for userId parameter */
export const userIdSchema = z.object({
  userId: z.string().cuid("userId must be a valid CUID"),
});

/** Schema for generating a receipt */
export const generateReceiptSchema = z.object({
  sessionId: z.string().cuid("sessionId must be a valid CUID"),
});

/** Schema for updating user profile */
export const updateUserSchema = z.object({
  userId: z.string().cuid("userId must be a valid CUID"),
  name: z.string().optional(),
  budgetDefault: z.number().int().positive("Budget must be positive (in cents)").optional(),
  plan: z.enum(["free", "premium", "family"]).optional(),
});

/** Schema for creating a demo user */
export const createDemoUserSchema = z.object({
  email: z.string().email("Valid email is required").optional(),
  name: z.string().optional(),
});
