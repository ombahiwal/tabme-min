import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { MenuCategory } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { menuCategorySchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (!['restaurant_admin', 'staff'].includes(authUser.role)) {
      return forbiddenResponse();
    }

    if (!authUser.restaurantId) {
      return forbiddenResponse('No restaurant associated with user');
    }

    await connectDB();

    const categories = await MenuCategory.find({ restaurantId: authUser.restaurantId })
      .sort({ sortOrder: 1 });

    return successResponse({
      categories: categories.map(cat => ({
        id: cat._id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      })),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (authUser.role !== 'restaurant_admin') {
      return forbiddenResponse();
    }

    if (!authUser.restaurantId) {
      return forbiddenResponse('No restaurant associated with user');
    }

    await connectDB();

    const body = await request.json();
    const validation = validateRequest(menuCategorySchema, body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    // Get max sort order
    const maxSortCategory = await MenuCategory.findOne({ restaurantId: authUser.restaurantId })
      .sort({ sortOrder: -1 });
    const nextSortOrder = (maxSortCategory?.sortOrder || 0) + 1;

    const category = await MenuCategory.create({
      ...validation.data,
      restaurantId: authUser.restaurantId,
      sortOrder: validation.data.sortOrder ?? nextSortOrder,
    });

    return successResponse({
      id: category._id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    }, 201);
  } catch (error) {
    console.error('Create category error:', error);
    return serverErrorResponse();
  }
}
