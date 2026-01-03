import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Order, Table, MenuItem } from '@/lib/models';
import { createOrderSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validation = validateRequest(createOrderSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    const { tableId, restaurantId, items, notes, customerName } = validation.data;

    // Verify table exists and belongs to restaurant
    const table = await Table.findOne({
      _id: tableId,
      restaurantId,
      isActive: true,
    });

    if (!table) {
      return notFoundResponse('Table not found or inactive');
    }

    // Fetch menu items and create order items with snapshots
    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findOne({
        _id: item.menuItemId,
        restaurantId,
        isAvailable: true,
      });

      if (!menuItem) {
        return errorResponse(`Menu item ${item.menuItemId} is not available`);
      }

      const itemTotal = menuItem.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    const order = await Order.create({
      restaurantId,
      tableId,
      status: 'created',
      items: orderItems,
      total,
      notes,
      customerName,
      statusHistory: [{ status: 'created', timestamp: new Date() }],
    });

    return successResponse({
      id: order._id,
      status: order.status,
      items: order.items,
      total: order.total,
      createdAt: order.createdAt,
    }, 201);
  } catch (error) {
    console.error('Create order error:', error);
    return serverErrorResponse();
  }
}
