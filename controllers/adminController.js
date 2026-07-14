import User from '../models/User.js';
import Note from '../models/Note.js';
import Announcement from '../models/Announcement.js';
import Complaint from '../models/Complaint.js';
import Event from '../models/Event.js';
import Post from '../models/Post.js';

// @desc    Get admin dashboard statistics
// @route   GET /api/v1/auth/admin/stats
// @access  Private (Admin Only)
export const getAdminStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Access denied. Admins only.');
    }

    // Run all counts in parallel for performance
    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      totalNotes,
      totalAnnouncements,
      totalComplaints,
      totalEvents,
      totalPosts,
      departmentBreakdown,
      recentUsers,
      openComplaints,
      resolvedComplaints,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      Note.countDocuments({}),
      Announcement.countDocuments({}),
      Complaint.countDocuments({}),
      Event.countDocuments({}),
      Post.countDocuments({}),
      // Group students by department
      User.aggregate([
        { $match: { role: 'student' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // 5 most recently registered users
      User.find({})
        .select('name email role department year avatar createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Complaint.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
      Complaint.countDocuments({ status: 'resolved' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          totalUsers,
          totalStudents,
          totalAdmins,
          totalNotes,
          totalAnnouncements,
          totalComplaints,
          totalEvents,
          totalPosts,
          openComplaints,
          resolvedComplaints,
        },
        departmentBreakdown: departmentBreakdown.map((d) => ({
          department: d._id || 'Other',
          count: d.count,
        })),
        recentUsers,
      },
      message: 'Admin statistics retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};
