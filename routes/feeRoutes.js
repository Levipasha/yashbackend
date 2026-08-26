const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const FeeCycle = require('../models/FeeCycle');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

// Helper to resolve student User object by ID string, mongo _id, or email
async function resolveStudentUser(param) {
  if (!param || param === 'undefined' || param === 'null' || param === 'invalid') return null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    const userById = await User.findById(param);
    if (userById) return userById;
  }
  const userByCode = await User.findOne({ 
    $or: [{ studentId: param }, { email: param }] 
  });
  return userByCode;
}

router.post('/cycle', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId, feeAmount, feeType, cycleDays, nextDueDate } = req.body;
    const numericAmount = Number(feeAmount) || 2000;
    
    let targetStudentId = studentId;
    const studentObj = await resolveStudentUser(studentId);
    if (studentObj) {
      targetStudentId = studentObj._id;
    }

    // Deactivate previous active fee cycles for this student
    await FeeCycle.updateMany({ studentId: targetStudentId, isActive: true }, { isActive: false });

    const newCycle = new FeeCycle({
      studentId: targetStudentId,
      tutorId: req.user ? req.user._id : null,
      feeAmount: numericAmount,
      feeType: feeType || 'Monthly Tuition',
      cycleDays: Number(cycleDays) || 30,
      nextDueDate: nextDueDate || new Date()
    });
    
    await newCycle.save();

    // Auto-link parent if available & update student termFee
    let parentId = req.body.parentId || null;
    if (studentObj) {
      studentObj.termFee = `₹${numericAmount.toLocaleString('en-IN')}`;
      await studentObj.save();

      if (!parentId) {
        if (studentObj.parentId) {
          parentId = studentObj.parentId;
        } else {
          const parentObj = await User.findOne({ children: studentObj._id });
          if (parentObj) parentId = parentObj._id;
        }
      }
    } else if (mongoose.Types.ObjectId.isValid(targetStudentId)) {
      await User.findByIdAndUpdate(targetStudentId, { 
        termFee: `₹${numericAmount.toLocaleString('en-IN')}` 
      });
    }

    // Remove any previous un-paid PENDING payments and issue new pending payment matching exact admin fee
    await Payment.deleteMany({ studentId: targetStudentId, status: 'PENDING' });

    const payment = new Payment({
      feeCycleId: newCycle._id,
      studentId: newCycle.studentId,
      parentId: parentId,
      amount: numericAmount,
      dueDate: newCycle.nextDueDate,
      status: 'PENDING'
    });
    await payment.save();

    res.status(201).json(newCycle);
  } catch (error) {
    console.error('Error creating fee cycle:', error);
    res.status(500).json({ message: 'Error creating fee cycle', error: error.message });
  }
});

// Get overall revenue summary analytics (paid vs unpaid)
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const validStudents = await User.find({
      $or: [
        { role: 'student' },
        { role: 'Student' },
        { studentId: { $exists: true, $ne: null, $ne: '' } }
      ]
    });
    
    // Deduplicate unique students
    const uniqueStudentsMap = new Map();
    validStudents.forEach(st => {
      const key = (st.studentId && st.studentId !== 'N/A') ? st.studentId : st._id.toString();
      if (!uniqueStudentsMap.has(key)) {
        uniqueStudentsMap.set(key, st);
      }
    });
    const uniqueStudents = Array.from(uniqueStudentsMap.values());
    const validIds = uniqueStudents.map(s => s._id);

    // Clean up orphaned payment records and fee cycles for students that no longer exist
    await Payment.deleteMany({ studentId: { $nin: validIds } });
    await FeeCycle.deleteMany({ studentId: { $nin: validIds } });

    // Clean up any old unconfirmed fake PAID payments that were auto-created by old default status bug
    await Payment.deleteMany({
      studentId: { $in: validIds },
      status: 'PAID',
      $and: [
        { $or: [{ isOnlinePaid: false }, { isOnlinePaid: null }, { isOnlinePaid: { $exists: false } }] },
        { $or: [{ cashConfirmedBy: null }, { cashConfirmedBy: { $exists: false } }] }
      ]
    });

    let totalCollected = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    for (const st of uniqueStudents) {
      let stPayments = await Payment.find({ studentId: st._id }).sort({ dueDate: -1 });

      // If student has multiple PENDING payments while unpaid, delete premature extra future PENDING invoices
      const pendingPayments = stPayments.filter(item => item.status === 'PENDING').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      if (pendingPayments.length > 1) {
        const extraPendingIds = pendingPayments.slice(1).map(item => item._id);
        await Payment.deleteMany({ _id: { $in: extraPendingIds } });
        stPayments = stPayments.filter(item => !extraPendingIds.some(id => id.equals(item._id)));
      }

      // Sum up actual real paid payments (online paid or cash confirmed)
      const realPaidPayments = stPayments.filter(p => p.status === 'PAID' && (p.isOnlinePaid || p.cashConfirmedBy));
      realPaidPayments.forEach(p => {
        totalCollected += (Number(p.amount) || 0);
        paidCount++;
      });

      const now = new Date();
      const isStudentPaid = realPaidPayments.length > 0 || st.status === 'Paid';

      // Active pending invoice for this student ONLY if due up to current date or student has never paid
      const currentPeriodPending = stPayments.find(p => {
        if (p.status !== 'PENDING' && p.status !== 'OVERDUE') return false;
        if (!isStudentPaid) return true;
        return new Date(p.dueDate) <= now;
      });

      if (currentPeriodPending) {
        totalPending += (Number(currentPeriodPending.amount) || 2000);
        pendingCount++;
      } else if (!isStudentPaid) {
        // Fallback for new unpaid student without payment doc yet
        const amt = parseFloat((st.termFee || '2000').replace(/[^0-9.]/g, '')) || 2000;
        totalPending += amt;
        pendingCount++;
      }
    }

    res.json({
      totalRevenue: totalCollected + totalPending,
      totalCollected,
      totalPending,
      paidCount,
      pendingCount,
      paymentsCount: uniqueStudents.length
    });
  } catch (error) {
    console.error('Error fetching fee summary:', error);
    res.status(500).json({ message: 'Error fetching revenue summary' });
  }
});

// Get all active fee cycles for admin overview
router.get('/cycles', requireAuth, async (req, res) => {
  try {
    const cycles = await FeeCycle.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fee cycles' });
  }
});

// Get comprehensive status list of all students (who paid and who has not paid)
router.get('/all-status', requireAuth, async (req, res) => {
  try {
    const students = await User.find({
      $or: [
        { role: 'student' },
        { role: 'Student' },
        { studentId: { $exists: true, $ne: null, $ne: '' } }
      ]
    }).populate('parentId', 'fullName email phone');

    // Deduplicate students by studentId or _id
    const uniqueStudentsMap = new Map();
    students.forEach(st => {
      const key = (st.studentId && st.studentId !== 'N/A') ? st.studentId : st._id.toString();
      if (!uniqueStudentsMap.has(key)) {
        uniqueStudentsMap.set(key, st);
      }
    });
    const uniqueStudents = Array.from(uniqueStudentsMap.values());

    const payments = await Payment.find({}).sort({ dueDate: -1 });

    const paymentsByStudentMap = {};
    payments.forEach(p => {
      const sId = p.studentId ? p.studentId.toString() : null;
      if (sId) {
        if (!paymentsByStudentMap[sId]) {
          paymentsByStudentMap[sId] = [];
        }
        paymentsByStudentMap[sId].push(p);
      }
    });

    const result = await Promise.all(uniqueStudents.map(async (st) => {
      const stIdStr = st._id.toString();
      let stPayments = paymentsByStudentMap[stIdStr] || [];

      // 1. Sanitize any auto-generated PAID records that were not actually confirmed cash or online paid
      for (const p of stPayments) {
        if (p.status === 'PAID' && !p.cashConfirmedBy && !p.isOnlinePaid) {
          p.status = 'PENDING';
          p.paymentMethod = 'NONE';
          p.paymentDate = null;
          p.transactionId = undefined;
          await p.save();
          st.status = 'Unpaid';
          await User.findByIdAndUpdate(st._id, { status: 'Unpaid' });
        }
      }

      // Re-fetch payments after sanitization
      stPayments = await Payment.find({ studentId: st._id }).sort({ dueDate: -1 });

      // 2. Remove premature future PENDING invoices if current invoice is unpaid
      const pendingPayments = stPayments.filter(item => item.status === 'PENDING').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      if (pendingPayments.length > 1) {
        const extraPendingIds = pendingPayments.slice(1).map(item => item._id);
        await Payment.deleteMany({ _id: { $in: extraPendingIds } });
        stPayments = stPayments.filter(item => !extraPendingIds.some(id => id.equals(item._id)));
      }

      // 3. Fallback: If no payment records exist yet for this student, auto-generate an initial payment invoice
      if (stPayments.length === 0) {
        const numAmount = parseFloat((st.termFee || '2000').replace(/[^0-9.]/g, '')) || 2000;
        const isPaid = st.status === 'Paid';
        const initialPayment = new Payment({
          studentId: st._id,
          parentId: st.parentId ? (st.parentId._id || st.parentId) : null,
          amount: numAmount,
          status: isPaid ? 'PAID' : 'PENDING',
          paymentMethod: isPaid ? 'ONLINE' : 'NONE',
          dueDate: new Date(),
          paymentDate: isPaid ? new Date() : null,
          transactionId: isPaid ? `TXN-${Date.now()}` : undefined
        });
        await initialPayment.save();
        stPayments = [initialPayment];
      }

      const paidPayment = stPayments.find(p => p.status === 'PAID' && (p.isOnlinePaid || p.cashConfirmedBy));
      const pendingPayment = stPayments.find(p => p.status === 'PENDING' || p.status === 'OVERDUE');

      const isPaid = (st.status === 'Paid') || Boolean(paidPayment);
      const now = new Date();
      const hasOverduePending = pendingPayment && new Date(pendingPayment.dueDate) <= now;
      const isUpToDate = isPaid && !hasOverduePending;

      const latestPayment = isPaid ? (paidPayment || stPayments[0]) : (pendingPayment || stPayments[0]);
      const nextPayment = (isPaid && pendingPayment && new Date(pendingPayment.dueDate) > now) ? pendingPayment : null;

      let parentInfo = st.parentId;
      if (!parentInfo) {
        const parentUser = await User.findOne({ children: st._id }).select('fullName email phone');
        if (parentUser) parentInfo = parentUser;
      }

      return {
        _id: st._id,
        fullName: st.fullName,
        studentId: st.studentId || 'N/A',
        email: st.email,
        courseName: st.courseName || 'General Tuition',
        termFee: st.termFee || '₹2,000',
        userStatus: st.status,
        parent: parentInfo ? {
          fullName: parentInfo.fullName,
          email: parentInfo.email,
          phone: parentInfo.phone
        } : null,
        payments: stPayments,
        latestPayment: latestPayment ? {
          _id: latestPayment._id,
          amount: latestPayment.amount,
          status: latestPayment.status,
          paymentMethod: latestPayment.paymentMethod,
          dueDate: latestPayment.dueDate,
          paymentDate: latestPayment.paymentDate,
          transactionId: latestPayment.transactionId
        } : null,
        nextDueDate: nextPayment ? nextPayment.dueDate : null,
        isPaid: isUpToDate,
        isUpToDate: isUpToDate,
        pendingPaymentId: pendingPayment ? pendingPayment._id : (latestPayment ? latestPayment._id : null)
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching fee status list:', error);
    res.status(500).json({ message: 'Error fetching fee status list', error: error.message });
  }
});

// Get active fee cycles for a student
router.get('/student/:studentId', requireAuth, async (req, res) => {
  try {
    const p = req.params.studentId;
    if (!p || p === 'undefined' || p === 'null' || p === 'invalid') return res.json([]);

    const studentObj = await resolveStudentUser(p);
    const targetId = studentObj ? studentObj._id : (mongoose.Types.ObjectId.isValid(p) ? p : null);
    if (!targetId) return res.json([]);

    const cycles = await FeeCycle.find({ studentId: targetId, isActive: true });
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fee cycles' });
  }
});

// Get payments for a student
router.get('/payments/student/:studentId', requireAuth, async (req, res) => {
  try {
    const p = req.params.studentId;
    if (!p || p === 'undefined' || p === 'null' || p === 'invalid') return res.json([]);

    const studentObj = await resolveStudentUser(p);
    const targetId = studentObj ? studentObj._id : (mongoose.Types.ObjectId.isValid(p) ? p : null);
    if (!targetId) return res.json([]);

    let payments = await Payment.find({ studentId: targetId }).sort({ dueDate: -1 });

    // 1. Sanitize any auto-generated PAID records that were not actually confirmed cash or online paid
    for (const item of payments) {
      if (item.status === 'PAID' && !item.cashConfirmedBy && !item.isOnlinePaid) {
        item.status = 'PENDING';
        item.paymentMethod = 'NONE';
        item.paymentDate = null;
        item.transactionId = undefined;
        await item.save();
        if (studentObj) {
          studentObj.status = 'Unpaid';
          await User.findByIdAndUpdate(studentObj._id, { status: 'Unpaid' });
        }
      }
    }

    // Re-fetch payments after sanitization
    payments = await Payment.find({ studentId: targetId }).sort({ dueDate: -1 });

    // 2. If student has unpaid PENDING payments, remove any premature future PENDING invoices
    const pendingPayments = payments.filter(item => item.status === 'PENDING').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (pendingPayments.length > 1) {
      const extraPendingIds = pendingPayments.slice(1).map(item => item._id);
      await Payment.deleteMany({ _id: { $in: extraPendingIds } });
      payments = payments.filter(item => !extraPendingIds.some(id => id.equals(item._id)));
    }

    // 3. Fallback: If no payment records exist yet for this student, auto-generate an initial payment invoice
    if (payments.length === 0 && studentObj) {
      const numAmount = parseFloat((studentObj.termFee || '2000').replace(/[^0-9.]/g, '')) || 2000;
      const isPaid = studentObj.status === 'Paid';

      const initialPayment = new Payment({
        studentId: studentObj._id,
        parentId: studentObj.parentId || null,
        amount: numAmount,
        status: isPaid ? 'PAID' : 'PENDING',
        paymentMethod: isPaid ? 'ONLINE' : 'NONE',
        dueDate: new Date(),
        paymentDate: isPaid ? new Date() : null,
        transactionId: isPaid ? `TXN-${Date.now()}` : undefined
      });

      await initialPayment.save();
      payments = [initialPayment];
    }

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

// Confirm Cash Payment (Only Teacher/Admin)
router.post('/payments/:paymentId/confirm-cash', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    let payment = null;
    if (mongoose.Types.ObjectId.isValid(req.params.paymentId)) {
      payment = await Payment.findById(req.params.paymentId);
    }
    
    if (!payment) {
      payment = await Payment.findOne({ studentId: req.params.paymentId, status: 'PENDING' });
    }

    if (!payment) {
      const studentObj = await resolveStudentUser(req.params.paymentId);
      if (studentObj) {
        payment = new Payment({
          studentId: studentObj._id,
          amount: parseFloat((studentObj.termFee || '2000').replace(/[^0-9.]/g, '')) || 2000,
          status: 'PAID',
          paymentMethod: 'CASH',
          paymentDate: new Date(),
          dueDate: new Date(),
          cashConfirmedBy: req.user ? req.user._id : null
        });
        await payment.save();
        studentObj.status = 'Paid';
        await studentObj.save();
        return res.json({ message: 'Cash payment confirmed and student marked as Paid', payment });
      }
      return res.status(404).json({ message: 'Payment or Student record not found' });
    }

    payment.status = 'PAID';
    payment.paymentMethod = 'CASH';
    payment.paymentDate = new Date();
    if (req.user) payment.cashConfirmedBy = req.user._id;
    await payment.save();

    if (payment.studentId) {
      await User.findByIdAndUpdate(payment.studentId, { status: 'Paid' });
    }

    if (payment.feeCycleId) {
      const cycle = await FeeCycle.findById(payment.feeCycleId);
      if (cycle && cycle.isActive) {
        const nextDate = new Date(cycle.nextDueDate);
        nextDate.setDate(nextDate.getDate() + cycle.cycleDays);
        cycle.nextDueDate = nextDate;
        await cycle.save();

        const newPayment = new Payment({
          feeCycleId: cycle._id,
          studentId: cycle.studentId,
          parentId: payment.parentId,
          amount: cycle.feeAmount,
          dueDate: cycle.nextDueDate,
          status: 'PENDING'
        });
        await newPayment.save();
      }
    } else if (payment.studentId) {
      const existingPending = await Payment.findOne({ studentId: payment.studentId, status: 'PENDING' });
      if (!existingPending) {
        const nextDueDate = new Date(Date.now() + 30 * 86400000);
        const newPayment = new Payment({
          studentId: payment.studentId,
          parentId: payment.parentId,
          amount: payment.amount,
          dueDate: nextDueDate,
          status: 'PENDING',
          paymentMethod: 'NONE'
        });
        await newPayment.save();
      }
    }

    res.json({ message: 'Cash payment confirmed successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming cash payment', error: error.message });
  }
});

// Simulate Online Payment Success
router.post('/payments/:paymentId/pay-online', requireAuth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'PAID') return res.status(400).json({ message: 'Payment already marked as PAID' });

    payment.status = 'PAID';
    payment.isOnlinePaid = true;
    payment.paymentMethod = 'ONLINE';
    payment.paymentDate = new Date();
    payment.transactionId = `TXN-${Date.now()}`;
    await payment.save();

    // Also update student user status to Paid
    if (payment.studentId) {
      await User.findByIdAndUpdate(payment.studentId, { status: 'Paid' });
    }

    if (payment.feeCycleId) {
      const cycle = await FeeCycle.findById(payment.feeCycleId);
      if (cycle && cycle.isActive) {
        const nextDate = new Date(cycle.nextDueDate);
        nextDate.setDate(nextDate.getDate() + cycle.cycleDays);
        cycle.nextDueDate = nextDate;
        await cycle.save();

        const newPayment = new Payment({
          feeCycleId: cycle._id,
          studentId: cycle.studentId,
          parentId: payment.parentId,
          amount: cycle.feeAmount,
          dueDate: cycle.nextDueDate,
          status: 'PENDING'
        });
        await newPayment.save();
      }
    } else if (payment.studentId) {
      const existingPending = await Payment.findOne({ studentId: payment.studentId, status: 'PENDING' });
      if (!existingPending) {
        const nextDueDate = new Date(Date.now() + 30 * 86400000);
        const newPayment = new Payment({
          studentId: payment.studentId,
          parentId: payment.parentId,
          amount: payment.amount,
          dueDate: nextDueDate,
          status: 'PENDING',
          paymentMethod: 'NONE'
        });
        await newPayment.save();
      }
    }

    res.json({ message: 'Online payment successful and next cycle generated', payment });
  } catch (error) {
    console.error('Error paying online:', error);
    res.status(500).json({ message: 'Error processing online payment' });
  }
});

module.exports = router;
