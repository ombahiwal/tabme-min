import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { Table } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { tableSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(
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

    await connectDB();

    const { id } = params;
    const table = await Table.findOne({
      _id: id,
      restaurantId: authUser.restaurantId,
    });

    if (!table) {
      return notFoundResponse('Table not found');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      capacity: table.capacity,
      isActive: table.isActive,
    });
  } catch (error) {
    console.error('Get table error:', error);
    return serverErrorResponse();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (authUser.role !== 'restaurant_admin') {
      return forbiddenResponse();
    }

    await connectDB();

    const { id } = params;
    const body = await request.json();
    const validation = validateRequest(tableSchema.partial(), body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    // Check if changing table number to one that already exists
    if (validation.data.number) {
      const existingTable = await Table.findOne({
        restaurantId: authUser.restaurantId,
        number: validation.data.number,
        _id: { $ne: id },
      });

      if (existingTable) {
        return errorResponse(`Table number ${validation.data.number} already exists`);
      }
    }

    const table = await Table.findOneAndUpdate(
      { _id: id, restaurantId: authUser.restaurantId },
      validation.data,
      { new: true }
    );

    if (!table) {
      return notFoundResponse('Table not found');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      capacity: table.capacity,
      isActive: table.isActive,
    });
  } catch (error) {
    console.error('Update table error:', error);
    return serverErrorResponse();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (authUser.role !== 'restaurant_admin') {
      return forbiddenResponse();
    }

    await connectDB();

    const { id } = params;
    const table = await Table.findOneAndDelete({
      _id: id,
      restaurantId: authUser.restaurantId,
    });

    if (!table) {
      return notFoundResponse('Table not found');
    }

    return successResponse({ message: 'Table deleted' });
  } catch (error) {
    console.error('Delete table error:', error);
    return serverErrorResponse();
  }
}
