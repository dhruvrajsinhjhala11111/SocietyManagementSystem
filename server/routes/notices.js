const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createNotice, getNotices, getNotice,
  updateNotice, deleteNotice,
} = require('../controllers/noticeController');

router.route('/')
  .get(protect, getNotices)
  .post(protect, authorize('admin'), (req, res, next) => {
    req.uploadSubDir = 'notices';
    next();
  }, upload.array('attachments', 5), createNotice);

router.route('/:id')
  .get(protect, getNotice)
  .put(protect, authorize('admin'), updateNotice)
  .delete(protect, authorize('admin'), deleteNotice);

module.exports = router;
