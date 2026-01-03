import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db';
import { Table } from '@/lib/models';
import { getAuthUser } from '@/lib/auth';
import { successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
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
    
    const newQrCode = crypto.randomBytes(16).toString('hex');

    const table = await Table.findOneAndUpdate(
      { _id: id, restaurantId: authUser.restaurantId },
      { qrCode: newQrCode },
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
    console.error('Regenerate QR error:', error);
    return serverErrorResponse();
  }
}
