const { sendNotImplemented } = require('../../utils/response.util');
const licensesService = require('./licenses.service');

void licensesService;

exports.getMyLicenses = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'GET /api/licenses/my',
    todo: 'Truy vấn license_keys WHERE owner_user_id = req.user.userId (trả dạng che masked, chưa giải mã).'
  });

exports.revealLicenseKey = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/licenses/:id/reveal',
    todo: 'Kiểm tra owner_user_id === req.user.userId (chống IDOR -> 403 + audit_logs), gọi decryptAesGcm() trả plaintext key và ghi LICENSE_REVEALED.'
  });

exports.createDownloadLink = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/licenses/:id/download-link',
    todo: 'Kiểm tra chủ sở hữu license và đơn đã CONFIRMED/COMPLETED, gọi createSignedDownloadToken() TTL 300s.'
  });

exports.downloadBySignedToken = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'GET /api/licenses/download',
    todo: 'Xác thực token bằng verifySignedDownloadToken(), chống Path Traversal bằng assertNoPathTraversal() trên uploads/assets/ và stream tệp.'
  });
