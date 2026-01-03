import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Table, Restaurant } from '@/lib/models';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { restaurantSlug: string; tableCode: string } }
) {
  try {
    await connectDB();

    const restaurantSlug = params.restaurantSlug.toLowerCase();
    const tableCode = params.tableCode.toLowerCase();

    const restaurant = await Restaurant.findOne({ slug: restaurantSlug, isActive: true });
    if (!restaurant) {
      return notFoundResponse('Restaurant not found or inactive');
    }

    const table = await Table.findOne({
      restaurantId: restaurant._id,
      code: tableCode,
      isActive: true,
    });

    if (!table) {
      return notFoundResponse('Table not found or inactive');
    }

    return successResponse({
      table: {
        id: table._id,
        name: table.name,
        number: table.number,
        code: table.code,
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        currency: restaurant.currency,
        address: restaurant.address,
        phone: restaurant.phone,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
      },
    });
  } catch (error) {
    console.error('QR resolve (slug/code) error:', error);
    return serverErrorResponse();
  }
}
