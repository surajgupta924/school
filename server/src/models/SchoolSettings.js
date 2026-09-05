import mongoose from 'mongoose';

const schoolSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    schoolName: { type: String, default: 'XYZ Convent School' },
    address: {
      type: String,
      default: 'Sector 12, Dwarka, New Delhi 110078',
    },
    phone: { type: String, default: '+91-11-4000-1234' },
    email: { type: String, default: 'info@xyzconvent.edu' },
    website: { type: String, default: 'https://xyzconvent.edu' },
    academicYear: { type: String, default: '2025-26' },
    logoUrl: String,
    principalName: { type: String, default: 'Dr. Meera Kapoor' },
    affiliationNo: { type: String, default: 'CBSE-2734015' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    attendanceSessions: {
      type: [String],
      default: ['morning', 'afternoon'],
    },
    feeCurrency: { type: String, default: 'INR' },
    transportEnabled: { type: Boolean, default: true },
    qrAttendanceEnabled: { type: Boolean, default: true },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

schoolSettingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) {
    doc = await this.create({ key: 'default' });
  }
  return doc;
};

export const SchoolSettings = mongoose.model('SchoolSettings', schoolSettingsSchema);
