import { SchoolEvent } from '../models/SchoolEvent.js';
import { Visitor } from '../models/Visitor.js';
import { User } from '../models/User.js';

export async function seedOfficeIfNeeded() {
  const eventCount = await SchoolEvent.countDocuments();
  if (eventCount === 0) {
    const now = new Date();
    const inDays = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() + n);
      d.setHours(10, 0, 0, 0);
      return d;
    };
    await SchoolEvent.insertMany([
      {
        title: 'PTM — Classes 1 to 5',
        description: 'Parent teacher meeting for primary section',
        startAt: inDays(3),
        location: 'Main Auditorium',
        audience: 'parents',
      },
      {
        title: 'Independence Day Rehearsal',
        description: 'Cultural programme rehearsal',
        startAt: inDays(7),
        location: 'School Ground',
        audience: 'students',
      },
      {
        title: 'Staff Meeting',
        description: 'Monthly academic review',
        startAt: inDays(1),
        location: 'Conference Room',
        audience: 'staff',
      },
    ]);
  }

  const visitorCount = await Visitor.countDocuments();
  if (visitorCount === 0) {
    await Visitor.insertMany([
      {
        name: 'Ramesh Gupta',
        phone: '9876543210',
        purpose: 'Fee enquiry',
        meetingWith: 'Accountant',
        status: 'out',
        checkInAt: new Date(Date.now() - 3 * 3600000),
        checkOutAt: new Date(Date.now() - 2 * 3600000),
      },
      {
        name: 'Priya Sharma',
        phone: '9123456780',
        purpose: 'Admission counselling',
        meetingWith: 'Admin Office',
        status: 'in',
        checkInAt: new Date(),
      },
    ]);
  }

  // Ensure a few students celebrate birthday today for dashboard demo
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  const birthdayCount = await User.countDocuments({
    role: 'student',
    isActive: true,
    $expr: {
      $and: [{ $eq: [{ $month: '$dob' }, month + 1] }, { $eq: [{ $dayOfMonth: '$dob' }, day] }],
    },
  });
  if (birthdayCount === 0) {
    const students = await User.find({ role: 'student', isActive: true }).limit(3);
    for (const s of students) {
      const dob = new Date(s.dob || '2012-01-01');
      dob.setMonth(month);
      dob.setDate(day);
      s.dob = dob;
      await s.save();
    }
  }

  console.log('Office module seeded (events, visitors, birthday DOBs)');
}
