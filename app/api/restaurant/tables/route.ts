import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { Table } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { tableSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

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

    const tables = await Table.find({ restaurantId: authUser.restaurantId })
      .sort({ number: 1 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return successResponse({
      tables: tables.map(table => ({
        id: table._id,
        name: table.name,
        number: table.number,
        qrCode: table.qrCode,
        qrUrl: `${baseUrl}/qr/${table.qrCode}`,
        capacity: table.capacity,
        isActive: table.isActive,
      })),
    });
  } catch (error) {
    console.error('Get tables error:', error);
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    if (authUser.role !== 'restaurant_admin') {
      return forbiddenResponse();
    }

    if (!authUser.restaurantId) {
      return forbiddenResponse('No restaurant associated with user');
    }

    await connectDB();

    const body = await request.json();
    const validation = validateRequest(tableSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error);
    }

    // Check if table number already exists
    const existingTable = await Table.findOne({
      restaurantId: authUser.restaurantId,
      number: validation.data.number,
    });

    if (existingTable) {
      return errorResponse(`Table number ${validation.data.number} already exists`);
    }

    const qrCode = crypto.randomBytes(16).toString('hex');

    const table = await Table.create({
      ...validation.data,
      restaurantId: authUser.restaurantId,
      qrCode,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      capacity: table.capacity,
      isActive: table.isActive,
    }, 201);
  } catch (error) {
    console.error('Create table error:', error);
    return serverErrorResponse();
  }
}
