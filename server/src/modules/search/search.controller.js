const { sendNotImplemented } = require('../../utils/response.util');
const searchService = require('./search.service');

void searchService;

exports.searchProducts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'GET /api/search',
    todo: 'Truy vấn Meilisearch index seculicense_products hỗ trợ không dấu & chịu lỗi chính tả, lọc ProductType & maxPrice.'
  });

exports.syncAllProducts = async (req, res) =>
  sendNotImplemented(res, {
    owner: 'Thành viên B',
    endpoint: 'POST /api/search/sync',
    todo: 'Đẩy toàn bộ bảng products từ PostgreSQL sang Meilisearch với searchableAttributes/filterableAttributes/sortableAttributes.'
  });
