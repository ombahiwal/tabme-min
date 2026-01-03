import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { MenuItem, MenuCategory } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { menuItemSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

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

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const query: Record<string, unknown> = { restaurantId: authUser.restaurantId };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const items = await MenuItem.find(query).sort({ sortOrder: 1 });

    return successResponse({
      items: items.map(item => ({
        id: item._id,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        tags: item.tags,
        allergens: item.allergens,
      })),
    });
  } catch (error) {
    console.error('Get items error:', error);
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
    const validation = validateRequest(menuItemSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    // Verify category exists and belongs to restaurant
    const category = await MenuCategory.findOne({
      _id: validation.data.categoryId,
      restaurantId: authUser.restaurantId,
    });

    if (!category) {
      return notFoundResponse('Category not found');
    }

    // Get max sort order in category
    const maxSortItem = await MenuItem.findOne({ categoryId: validation.data.categoryId })
      .sort({ sortOrder: -1 });
    const nextSortOrder = (maxSortItem?.sortOrder || 0) + 1;

    const item = await MenuItem.create({
      ...validation.data,
      restaurantId: authUser.restaurantId,
      sortOrder: validation.data.sortOrder ?? nextSortOrder,
      imageUrl: validation.data.imageUrl || undefined,
    });

    return successResponse({
      id: item._id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      sortOrder: item.sortOrder,
      tags: item.tags,
      allergens: item.allergens,
    }, 201);
  } catch (error) {
    console.error('Create item error:', error);
    return serverErrorResponse();
  }
}
