import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { Table, Restaurant } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { tableSchema, validateRequest } from '@/lib/validation';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const restaurant = await Restaurant.findById(authUser.restaurantId);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return successResponse({
      tables: tables.map(table => ({
        id: table._id,
        name: table.name,
        number: table.number,
        code: table.code,
        qrCode: table.qrCode,
        qrUrl: `${baseUrl}/qr/${table.qrCode}`,
        aliasQrUrl: restaurant ? `${baseUrl}/r/${restaurant.slug}/${table.code}` : null,
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

    const toCode = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const desiredCode = validation.data.code ? toCode(validation.data.code) : `table-${validation.data.number}`;

    const existingCode = await Table.findOne({
      restaurantId: authUser.restaurantId,
      code: desiredCode,
    });
    if (existingCode) {
      return errorResponse(`Table code ${desiredCode} already exists`);
    }

    const table = await Table.create({
      ...validation.data,
      restaurantId: authUser.restaurantId,
      code: desiredCode,
      qrCode,
    });

    const restaurant = await Restaurant.findById(authUser.restaurantId);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      code: table.code,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      aliasQrUrl: restaurant ? `${baseUrl}/r/${restaurant.slug}/${table.code}` : null,
      capacity: table.capacity,
      isActive: table.isActive,
    }, 201);
  } catch (error) {
    console.error('Create table error:', error);
    return serverErrorResponse();
  }
}
