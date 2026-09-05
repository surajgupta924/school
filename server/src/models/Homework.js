import mongoose from 'mongoose';

const homeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: String, required: true },
    className: { type: String, required: true },
    section: String,
    dueDate: { type: Date, required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attachments: [{ name: String, url: String }],
  },
  { timestamps: true }
);

homeworkSchema.index({ className: 1, section: 1, dueDate: -1 });

export const Homework = mongoose.model('Homework', homeworkSchema);
