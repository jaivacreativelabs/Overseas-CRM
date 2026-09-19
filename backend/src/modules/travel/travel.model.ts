import { Schema, model, Document, Types } from 'mongoose';
import { TravelItemStatus } from '../../config/constants';

export interface ITravelSupport extends Document {
  leadId: Types.ObjectId;
  studentId?: Types.ObjectId;
  // Accommodation
  accommodationStatus: TravelItemStatus;
  accommodationType?: string; // Dorm, Private Apartment, Homestay
  accommodationAddress?: string;
  accommodationContact?: string;
  // Flight
  flightStatus: TravelItemStatus;
  airline?: string;
  flightNumber?: string;
  flightDate?: Date;
  ticketUrl?: string;
  // Insurance
  insuranceStatus: TravelItemStatus;
  insuranceProvider?: string;
  policyNumber?: string;
  insuranceValidUntil?: Date;
  insuranceDocUrl?: string;
  // Departure & Arrival Tracking
  studentDeparted: boolean;
  departureDate?: Date;
  arrivalConfirmed: boolean;
  arrivalDate?: Date;
  arrivalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const travelSupportSchema = new Schema<ITravelSupport>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    accommodationStatus: {
      type: String,
      enum: Object.values(TravelItemStatus),
      default: TravelItemStatus.PENDING,
    },
    accommodationType: { type: String },
    accommodationAddress: { type: String },
    accommodationContact: { type: String },
    flightStatus: {
      type: String,
      enum: Object.values(TravelItemStatus),
      default: TravelItemStatus.PENDING,
    },
    airline: { type: String },
    flightNumber: { type: String },
    flightDate: { type: Date },
    ticketUrl: { type: String },
    insuranceStatus: {
      type: String,
      enum: Object.values(TravelItemStatus),
      default: TravelItemStatus.PENDING,
    },
    insuranceProvider: { type: String },
    policyNumber: { type: String },
    insuranceValidUntil: { type: Date },
    insuranceDocUrl: { type: String },
    studentDeparted: { type: Boolean, default: false },
    departureDate: { type: Date },
    arrivalConfirmed: { type: Boolean, default: false },
    arrivalDate: { type: Date },
    arrivalNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const TravelSupportModel = model<ITravelSupport>('TravelSupport', travelSupportSchema);
