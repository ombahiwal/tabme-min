import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { Order, Table } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { successResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, unknown> = { restaurantId: authUser.restaurantId };
    
    if (status) {
      // Support multiple statuses separated by comma
      const statuses = status.split(',');
      query.status = { $in: statuses };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Fetch table info for each order
    const tableIds = [...new Set(orders.map(o => o.tableId.toString()))];
    const tables = await Table.find({ _id: { $in: tableIds } });
    const tableMap = new Map(tables.map(t => [t._id.toString(), t]));

    const ordersWithTables = orders.map(order => {
      const table = tableMap.get(order.tableId.toString());
      return {
        id: order._id,
        status: order.status,
        items: order.items.map(item => ({
          name: item.nameSnapshot,
          price: item.priceSnapshot,
          quantity: item.quantity,
          notes: item.notes,
        })),
        total: order.total,
        notes: order.notes,
        customerName: order.customerName,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        table: table ? {
          id: table._id,
          name: table.name,
          number: table.number,
        } : null,
      };
    });

    return successResponse({ orders: ordersWithTables });
  } catch (error) {
    console.error('Get restaurant orders error:', error);
    return serverErrorResponse();
  }
}
