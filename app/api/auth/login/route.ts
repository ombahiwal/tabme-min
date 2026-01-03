import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/lib/models';
import { comparePassword, generateToken } from '@/lib/auth';
import { loginSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validation = validateRequest(loginSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }

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
    });
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse();
  }
}
