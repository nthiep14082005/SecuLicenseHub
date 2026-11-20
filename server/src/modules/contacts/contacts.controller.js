const { sendNotImplemented } = require('../../utils/response.util');
const contactsService = require('./contacts.service');

void contactsService;

exports.createContact = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/contacts',
    todo: 'Kiểm tra hợp lệ fullName/email/subject/message (đã qua sanitizeInput chống Stored XSS), lưu bảng contacts.'
  });

exports.listContacts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'GET /api/contacts',
    todo: 'Lấy danh sách phản hồi liên hệ cho Admin.'
  });

exports.resolveContact = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên A',
    endpoint: 'PATCH /api/contacts/:id/resolve',
    todo: 'Cập nhật trạng thái liên hệ sang RESOLVED và ghi audit_logs.'
  });
