import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Order } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { updateOrderStatusSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export async function PATCH(
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

    if (!authUser.restaurantId) {
      return forbiddenResponse('No restaurant associated with user');
    }

    await connectDB();

    const { id } = params;
    const body = await request.json();
    
    const validation = validateRequest(updateOrderStatusSchema, body);
    if (!validation.success) {
      return errorResponse(validation.error);
    }

    const { status, note } = validation.data;

    const order = await Order.findOne({
      _id: id,
      restaurantId: authUser.restaurantId,
    });

    if (!order) {
      return notFoundResponse('Order not found');
    }

    // Update status
    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note,
    });

    await order.save();

    return successResponse({
      id: order._id,
      status: order.status,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return serverErrorResponse();
  }
}
