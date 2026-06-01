import mongoose, { Schema, Document } from 'mongoose';

export interface IKitchenOrderItem {
  productId: number;
  productName: string;
  quantity: number;
}

export interface IKitchenOrder extends Document {
  orderId: number;          // ID del sistema principal (PostgreSQL)
  tableNumber: number;
  items: IKitchenOrderItem[];
  status: 'PENDIENTE' | 'EN_PREPARACION' | 'LISTO';
  receivedAt: Date;
  updatedAt: Date;
}

const KitchenOrderItemSchema = new Schema<IKitchenOrderItem>({
  productId:   { type: Number, required: true },
  productName: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 1 }
}, { _id: false });

const KitchenOrderSchema = new Schema<IKitchenOrder>({
  orderId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  tableNumber: {
    type: Number,
    required: true,
    min: 1
  },
  items: {
    type: [KitchenOrderItemSchema],
    required: true,
    validate: [(v: IKitchenOrderItem[]) => v.length > 0, 'Debe tener al menos un item']
  },
  status: {
    type: String,
    enum: ['PENDIENTE', 'EN_PREPARACION', 'LISTO'],
    default: 'PENDIENTE',
    index: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'kitchenorders',
  timestamps: false
});

KitchenOrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

KitchenOrderSchema.index({ orderId: 1 }, { unique: true });
KitchenOrderSchema.index({ status: 1 });
KitchenOrderSchema.index({ status: 1, receivedAt: 1 });

export const KitchenOrder = mongoose.model<IKitchenOrder>('KitchenOrder', KitchenOrderSchema);
