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

    const { email, password, name, role, restaurant: restaurantInput } = validation.data;

    const requestedRole = role || 'restaurant_admin';

    // Marketplace signup: only allow restaurant_admin self-registration
    if (requestedRole !== 'restaurant_admin') {
      return errorResponse('Only restaurant admin self-registration is supported', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }

    const passwordHash = await hashPassword(password);

    // Create restaurant for new admin
    const slugify = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const desiredSlug = restaurantInput?.slug ? slugify(restaurantInput.slug) : slugify(restaurantInput?.name || `${name}'s restaurant`);
    if (!desiredSlug || desiredSlug.length < 3) {
      return errorResponse('Invalid restaurant slug', 400);
    }

    const existingRestaurantSlug = await Restaurant.findOne({ slug: desiredSlug });
    if (existingRestaurantSlug) {
      return errorResponse('Restaurant slug already taken. Please choose another.', 409);
    }

    const restaurant = await Restaurant.create({
      name: restaurantInput?.name || `${name}'s Restaurant`,
      slug: desiredSlug,
      currency: restaurantInput?.currency || 'USD',
      address: restaurantInput?.address || 'Please update',
      phone: restaurantInput?.phone || '000-000-0000',
      email: email,
      isActive: true,
    });

    const restaurantId = restaurant._id;

    const user = await User.create({
      email,
      passwordHash,
      name,
      role: requestedRole,
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
