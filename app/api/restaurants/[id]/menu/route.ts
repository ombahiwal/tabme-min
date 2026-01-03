import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Restaurant, MenuCategory, MenuItem } from '@/lib/models';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant || !restaurant.isActive) {
      return notFoundResponse('Restaurant not found');
    }

    // Get all active categories sorted by sortOrder
    const categories = await MenuCategory.find({
      restaurantId: id,
      isActive: true,
    }).sort({ sortOrder: 1 });

    // Get all available menu items
    const items = await MenuItem.find({
      restaurantId: id,
      isAvailable: true,
    }).sort({ sortOrder: 1 });

    // Group items by category
    const menu = categories.map(category => ({
      id: category._id,
      name: category.name,
      description: category.description,
      items: items
        .filter(item => item.categoryId.toString() === category._id.toString())
        .map(item => ({
          id: item._id,
          name: item.name,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          tags: item.tags,
          allergens: item.allergens,
        })),
    }));

    return successResponse({
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        currency: restaurant.currency,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
      },
      menu,
    });
  } catch (error) {
    console.error('Get menu error:', error);
    return serverErrorResponse();
  }
}
