import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { Table, Restaurant } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { tableSchema, validateRequest } from '@/lib/validation';
import { getBaseUrl } from '@/lib/base-url';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

async function ensureRestaurantSlug(restaurantId: string) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return null;
  if (restaurant.slug && restaurant.slug.trim()) return restaurant;

  const base = slugify(restaurant.name || 'restaurant');
  if (!base || base.length < 3) return restaurant;

  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await Restaurant.findOne({ slug: candidate, _id: { $ne: restaurant._id } }).select('_id');
    if (!taken) break;
    candidate = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }

  await Restaurant.updateOne(
    { _id: restaurant._id, $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] },
    { $set: { slug: candidate } }
  );

  restaurant.slug = candidate;
  return restaurant;
}

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

    const baseUrl = getBaseUrl(request);

    const restaurant = authUser.restaurantId ? await ensureRestaurantSlug(String(authUser.restaurantId)) : null;

    // Best-effort backfill for legacy tables missing `code`
    let code = table.code;
    if (!code) {
      code = `table-${table.number}`.toLowerCase() as any;
      await Table.updateOne(
        { _id: table._id, restaurantId: authUser.restaurantId, $or: [{ code: { $exists: false } }, { code: null }, { code: '' }] },
        { $set: { code } }
      );
    }

    const aliasQrUrl = restaurant?.slug && code ? `${baseUrl}/r/${restaurant.slug}/${code}` : null;

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      code,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      aliasQrUrl,
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

    const toCode = (value: string) =>
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    if (validation.data.code) {
      const desiredCode = toCode(validation.data.code);
      const existingCode = await Table.findOne({
        restaurantId: authUser.restaurantId,
        code: desiredCode,
        _id: { $ne: id },
      });
      if (existingCode) {
        return errorResponse(`Table code ${desiredCode} already exists`);
      }
      (validation.data as any).code = desiredCode;
    }

    const table = await Table.findOneAndUpdate(
      { _id: id, restaurantId: authUser.restaurantId },
      validation.data,
      { new: true }
    );

    if (!table) {
      return notFoundResponse('Table not found');
    }

    const baseUrl = getBaseUrl(request);

    const restaurant = authUser.restaurantId ? await ensureRestaurantSlug(String(authUser.restaurantId)) : null;

    // Best-effort backfill for legacy tables missing `code`
    let code = table.code;
    if (!code) {
      code = `table-${table.number}`.toLowerCase() as any;
      await Table.updateOne(
        { _id: table._id, restaurantId: authUser.restaurantId, $or: [{ code: { $exists: false } }, { code: null }, { code: '' }] },
        { $set: { code } }
      );
    }

    const aliasQrUrl = restaurant?.slug && code ? `${baseUrl}/r/${restaurant.slug}/${code}` : null;

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      code,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      aliasQrUrl,
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
