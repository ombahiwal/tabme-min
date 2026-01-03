import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { Table, Restaurant } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { tableSchema, validateRequest } from '@/lib/validation';
import { getBaseUrl } from '@/lib/base-url';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

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

const toCode = (value: string) =>
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

async function ensureTableCode(table: any, restaurantId: string) {
  if (table.code && String(table.code).trim()) return String(table.code);

  const base = toCode(`table-${table.number}`);
  let candidate = base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await Table.findOne({ restaurantId, code: candidate, _id: { $ne: table._id } }).select('_id');
    if (!taken) break;
    candidate = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }

  await Table.updateOne(
    { _id: table._id, restaurantId, $or: [{ code: { $exists: false } }, { code: null }, { code: '' }] },
    { $set: { code: candidate } }
  );

  return candidate;
}

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

    const restaurant = await ensureRestaurantSlug(String(authUser.restaurantId));

    const baseUrl = getBaseUrl(request);

    const tableDtos = await Promise.all(
      tables.map(async (table) => {
        const code = await ensureTableCode(table, String(authUser.restaurantId));
        const aliasQrUrl = restaurant?.slug && code ? `${baseUrl}/r/${restaurant.slug}/${code}` : null;

        return {
          id: table._id,
          name: table.name,
          number: table.number,
          code,
          qrCode: table.qrCode,
          qrUrl: `${baseUrl}/qr/${table.qrCode}`,
          aliasQrUrl,
          capacity: table.capacity,
          isActive: table.isActive,
        };
      })
    );

    return successResponse({
      tables: tableDtos,
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

    const restaurant = await ensureRestaurantSlug(String(authUser.restaurantId));

    const baseUrl = getBaseUrl(request);

    return successResponse({
      id: table._id,
      name: table.name,
      number: table.number,
      code: table.code,
      qrCode: table.qrCode,
      qrUrl: `${baseUrl}/qr/${table.qrCode}`,
      aliasQrUrl: restaurant?.slug && table.code ? `${baseUrl}/r/${restaurant.slug}/${table.code}` : null,
      capacity: table.capacity,
      isActive: table.isActive,
    }, 201);
  } catch (error) {
    console.error('Create table error:', error);
    return serverErrorResponse();
  }
}
