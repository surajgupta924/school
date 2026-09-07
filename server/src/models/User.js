import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'accountant', 'student', 'parent', 'driver'],
      required: true,
    },
    admissionId: { type: String, trim: true, sparse: true },
    employeeId: { type: String, trim: true, sparse: true },
    phone: String,
    address: String,
    bloodGroup: String,
    dob: Date,
    photoUrl: String,
    className: String,
    section: String,
    subject: String,
    /** Parent → linked students */
    parentOf: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** Legacy alias kept in sync with parentOf for older clients */
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    qrTokenVersion: { type: Number, default: 1 },
    refreshTokenHash: { type: String, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1, name: 1 });
userSchema.index({ role: 1, className: 1, section: 1, isActive: 1 });
userSchema.index({ admissionId: 1 }, { unique: true, sparse: true });
userSchema.index({ name: 'text', email: 'text', admissionId: 'text' });

userSchema.pre('save', async function hashPassword(next) {
  if (this.parentOf?.length && (!this.studentIds || this.studentIds.length === 0)) {
    this.studentIds = this.parentOf;
  }
  if (this.studentIds?.length && (!this.parentOf || this.parentOf.length === 0)) {
    this.parentOf = this.studentIds;
  }
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    admissionId: this.admissionId,
    employeeId: this.employeeId,
    phone: this.phone,
    address: this.address,
    bloodGroup: this.bloodGroup,
    dob: this.dob,
    photoUrl: this.photoUrl,
    className: this.className,
    section: this.section,
    subject: this.subject,
    parentOf: this.parentOf,
    studentIds: this.studentIds?.length ? this.studentIds : this.parentOf,
    vehicleId: this.vehicleId,
    qrTokenVersion: this.qrTokenVersion,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
