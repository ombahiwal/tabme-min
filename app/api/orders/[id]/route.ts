import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Order, Table, Restaurant } from '@/lib/models';
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

    const order = await Order.findById(id);
    if (!order) {
      return notFoundResponse('Order not found');
    }

    const table = await Table.findById(order.tableId);
    const restaurant = await Restaurant.findById(order.restaurantId);

    return successResponse({
      id: order._id,
      status: order.status,
      items: order.items.map(item => ({
        menuItemId: item.menuItemId,
        name: item.nameSnapshot,
        price: item.priceSnapshot,
        quantity: item.quantity,
        notes: item.notes,
      })),
      total: order.total,
      notes: order.notes,
      customerName: order.customerName,
      statusHistory: order.statusHistory,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      table: table ? {
        id: table._id,
        name: table.name,
        number: table.number,
      } : null,
      restaurant: restaurant ? {
        id: restaurant._id,
        name: restaurant.name,
        currency: restaurant.currency,
      } : null,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return serverErrorResponse();
  }
}
