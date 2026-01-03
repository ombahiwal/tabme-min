import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrderStatus = 
  | 'created' 
  | 'accepted' 
  | 'preparing' 
  | 'ready' 
  | 'served' 
  | 'paid' 
  | 'cancelled';

export interface IOrderItem {
  menuItemId: mongoose.Types.ObjectId;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes?: string;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  tableId: mongoose.Types.ObjectId;
  status: OrderStatus;
  items: IOrderItem[];
  total: number;
  notes?: string;
  customerName?: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: Date;
    note?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    nameSnapshot: {
      type: String,
      required: true,
    },
    priceSnapshot: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    notes: {
      type: String,
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: true,
    },
    status: {
      type: String,
      enum: ['created', 'accepted', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
      default: 'created',
    },
    items: [OrderItemSchema],
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
    },
    customerName: {
      type: String,
    },
    statusHistory: [{
      status: {
        type: String,
        enum: ['created', 'accepted', 'preparing', 'ready', 'served', 'paid', 'cancelled'],
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      note: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Add status to history on status change
OrderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

// Indexes
OrderSchema.index({ restaurantId: 1, status: 1 });
OrderSchema.index({ tableId: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
