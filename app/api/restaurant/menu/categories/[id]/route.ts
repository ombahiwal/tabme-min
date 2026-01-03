import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { MenuCategory, MenuItem } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { menuCategorySchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

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
    const category = await MenuCategory.findOne({
      _id: id,
      restaurantId: authUser.restaurantId,
    });

    if (!category) {
      return notFoundResponse('Category not found');
    }

    return successResponse({
      id: category._id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  } catch (error) {
    console.error('Get category error:', error);
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
    const validation = validateRequest(menuCategorySchema.partial(), body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    const category = await MenuCategory.findOneAndUpdate(
      { _id: id, restaurantId: authUser.restaurantId },
      validation.data,
      { new: true }
    );

    if (!category) {
      return notFoundResponse('Category not found');
    }

    return successResponse({
      id: category._id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
  } catch (error) {
    console.error('Update category error:', error);
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

    // Check if category has menu items
    const itemCount = await MenuItem.countDocuments({ categoryId: id });
    if (itemCount > 0) {
      return errorResponse(`Cannot delete category with ${itemCount} items. Delete or move items first.`);
    }

    const category = await MenuCategory.findOneAndDelete({
      _id: id,
      restaurantId: authUser.restaurantId,
    });

    if (!category) {
      return notFoundResponse('Category not found');
    }

    return successResponse({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    return serverErrorResponse();
  }
}
