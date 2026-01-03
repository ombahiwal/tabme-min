import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['restaurant_admin', 'staff']).optional(),
});

// Menu category validation
export const menuCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// Menu item validation
export const menuItemSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().optional(),
  tags: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
});

export const menuItemUpdateSchema = menuItemSchema.partial();

// Table validation
export const tableSchema = z.object({
  name: z.string().min(1, 'Table name is required'),
  number: z.number().int().positive('Table number must be positive'),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// Order validation
export const orderItemSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().min(1, 'Table ID is required'),
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  customerName: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['created', 'accepted', 'preparing', 'ready', 'served', 'paid', 'cancelled']),
  note: z.string().optional(),
});

// Restaurant settings validation
export const restaurantSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}
