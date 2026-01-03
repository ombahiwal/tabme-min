import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Table, Restaurant } from '@/lib/models';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await connectDB();

    const { code } = params;

    const table = await Table.findOne({ qrCode: code, isActive: true });
    if (!table) {
      return notFoundResponse('Invalid or inactive QR code');
    }

    const restaurant = await Restaurant.findById(table.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return notFoundResponse('Restaurant not found or inactive');
    }

    return successResponse({
      table: {
        id: table._id,
        name: table.name,
        number: table.number,
      },
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        currency: restaurant.currency,
        address: restaurant.address,
        phone: restaurant.phone,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
      },
    });
  } catch (error) {
    console.error('QR resolve error:', error);
    return serverErrorResponse();
  }
}
