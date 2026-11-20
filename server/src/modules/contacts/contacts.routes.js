const express = require('express');
const contactsController = require('./contacts.controller');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');

const router = express.Router();

// TODO [Thành viên A]: Bật requireAuth, requireRole('ADMIN') trên GET / và PATCH /:id/resolve
void requireAuth;
void requireRole;

router.post('/', contactsController.createContact);
router.get('/', contactsController.listContacts);
router.patch('/:id/resolve', contactsController.resolveContact);

module.exports = router;
