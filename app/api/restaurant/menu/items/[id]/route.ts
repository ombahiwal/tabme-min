import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { MenuItem, MenuCategory } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { menuItemUpdateSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (!['restaurant_admin', 'staff'].includes(authUser.role)) {
      return forbiddenResponse();
    }

    await connectDB();

    const { id } = params;
    const item = await MenuItem.findOne({
      _id: id,
      restaurantId: authUser.restaurantId,
    });

    if (!item) {
      return notFoundResponse('Item not found');
    }

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
    });
  } catch (error) {
    console.error('Get item error:', error);
    return serverErrorResponse();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (authUser.role !== 'restaurant_admin') {
      return forbiddenResponse();
    }

    await connectDB();

    const { id } = params;
    const body = await request.json();
    const validation = validateRequest(menuItemUpdateSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    // If categoryId is being changed, verify new category exists
    if (validation.data.categoryId) {
      const category = await MenuCategory.findOne({
        _id: validation.data.categoryId,
        restaurantId: authUser.restaurantId,
      });

      if (!category) {
        return notFoundResponse('Category not found');
      }
    }

    const updateData = { ...validation.data };
    if (updateData.imageUrl === '') {
      updateData.imageUrl = undefined;
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, restaurantId: authUser.restaurantId },
      updateData,
      { new: true }
    );

    if (!item) {
      return notFoundResponse('Item not found');
    }

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
    });
  } catch (error) {
    console.error('Update item error:', error);
    return serverErrorResponse();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (authUser.role !== 'restaurant_admin') {
      return forbiddenResponse();
    }

    await connectDB();

    const { id } = params;
    const item = await MenuItem.findOneAndDelete({
      _id: id,
      restaurantId: authUser.restaurantId,
    });

    if (!item) {
      return notFoundResponse('Item not found');
    }

    return successResponse({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete item error:', error);
    return serverErrorResponse();
  }
}
