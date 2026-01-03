import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User, Restaurant } from '@/lib/models';
import { hashPassword, generateToken } from '@/lib/auth';
import { registerSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validation = validateRequest(registerSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    const { email, password, name, role } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }

    const passwordHash = await hashPassword(password);

    // If registering as restaurant_admin, create a restaurant
    let restaurantId;
    if (role === 'restaurant_admin') {
      const restaurant = await Restaurant.create({
        name: `${name}'s Restaurant`,
        currency: 'USD',
        address: 'Please update',
        phone: '000-000-0000',
        email: email,
      });
      restaurantId = restaurant._id;
    }

    const user = await User.create({
      email,
      passwordHash,
      name,
      role: role || 'customer',
      restaurantId,
    });

    const token = generateToken(user);

    return successResponse({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return serverErrorResponse();
  }
}
