import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface ITable extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  number: number;
  qrCode: string;
  isActive: boolean;
  capacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    number: {
      type: Number,
      required: true,
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    capacity: {
      type: Number,
      default: 4,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique QR code before saving
TableSchema.pre('save', function (next) {
  if (!this.qrCode) {
    this.qrCode = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// Static method to generate new QR code
TableSchema.statics.generateQRCode = function (): string {
  return crypto.randomBytes(16).toString('hex');
};

const Table: Model<ITable> = mongoose.models.Table || mongoose.model<ITable>('Table', TableSchema);

export default Table;
