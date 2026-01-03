import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User, Restaurant } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    await connectDB();

    const user = await User.findById(authUser.userId).select('-passwordHash');
    if (!user) {
      return unauthorizedResponse('User not found');
    }

    let restaurant = null;
    if (user.restaurantId) {
      restaurant = await Restaurant.findById(user.restaurantId);
    }

    return successResponse({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant: restaurant ? {
        id: restaurant._id,
        name: restaurant.name,
        currency: restaurant.currency,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        description: restaurant.description,
        logoUrl: restaurant.logoUrl,
      } : null,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return serverErrorResponse();
  }
}
