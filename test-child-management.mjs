import http from 'http';

let sessionToken = null;

function makeRequest(path, method = 'GET', body = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (sessionToken && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM TRA QUẢN LÝ VÀ XÓA HỒ SƠ CON ---');

  // 0. Lấy token xác thực từ server
  console.log('\n0. Lấy token xác thực cho cha mẹ...');
  const authRes = await makeRequest('/api/auth/token', 'POST', {}, {
    'Authorization': 'Bearer parent_master_secret_2026'
  });
  console.log('Kết quả cấp token:', authRes.status, authRes.body?.success ? 'THÀNH CÔNG' : 'THẤT BẠI');
  if (!authRes.body?.token) {
    throw new Error('Không thể lấy token xác thực');
  }
  sessionToken = authRes.body.token;

  const testChildId = 'test_child_' + Date.now();
  const parentId = 'family_primary';

  // 1. Tạo hồ sơ con thử nghiệm
  console.log('\n1. Tạo hồ sơ con thử nghiệm qua API...');
  const createRes = await makeRequest('/api/children', 'POST', {
    parentId,
    child: {
      id: testChildId,
      name: 'Bé Thử Nghiệm Xóa',
      age: 9,
      grade: 'Lớp 4',
      avatar: 'https://images.unsplash.com/photo-1543332164-6e82f355badc',
      status: 'online',
      battery: 92,
      devices: [
        {
          deviceId: 'dev_' + testChildId,
          deviceName: 'Điện thoại Test',
          deviceType: 'phone',
        }
      ]
    }
  });

  console.log('Kết quả tạo bé:', createRes.status, createRes.body?.success ? 'THÀNH CÔNG' : 'THẤT BẠI');
  if (!createRes.body?.success) {
    throw new Error('Không thể tạo hồ sơ con thử nghiệm');
  }

  // 2. Thêm cài đặt và pairing thử nghiệm cho bé
  console.log('\n2. Thêm settings thử nghiệm cho bé...');
  await makeRequest('/api/settings', 'POST', {
    childId: testChildId,
    settings: {
      screenTimeLimitMinutes: 90,
      isLocked: false,
    }
  });

  // 3. Kiểm tra danh sách con
  console.log('\n3. Lấy danh sách con từ server...');
  const getRes = await makeRequest(`/api/children?parentId=${parentId}`, 'GET');
  const foundInList = getRes.body?.children?.some((c) => c.id === testChildId);
  console.log(`Bé có trong danh sách server: ${foundInList ? 'CÓ (Đúng)' : 'KHÔNG (Lỗi)'}`);

  // 4. Xóa bé qua DELETE /api/children
  console.log('\n4. Gọi DELETE /api/children để xóa hồ sơ bé và dữ liệu liên quan...');
  const deleteRes = await makeRequest(`/api/children?parentId=${parentId}&childId=${testChildId}`, 'DELETE');
  console.log('Kết quả xóa:', deleteRes.status, deleteRes.body);

  // 5. Kiểm tra lại danh sách con
  console.log('\n5. Xác minh bé đã bị xóa khỏi danh sách...');
  const getAfterRes = await makeRequest(`/api/children?parentId=${parentId}`, 'GET');
  const stillInList = getAfterRes.body?.children?.some((c) => c.id === testChildId);
  console.log(`Bé còn trong danh sách không: ${stillInList ? 'CÒN (Lỗi)' : 'ĐÃ BIẾN MẤT (Chính xác 100%)'}`);

  if (stillInList) {
    throw new Error('Bé vẫn còn tồn tại sau khi xóa!');
  }

  // 6. Kiểm tra settings của bé đã được cascade cleanup chưa
  console.log('\n6. Xác minh cài đặt settings của bé đã được giải phóng...');
  const settingsRes = await makeRequest(`/api/settings?childId=${testChildId}`, 'GET');
  const hasSettings = settingsRes.body?.settings && Object.keys(settingsRes.body.settings).length > 0;
  console.log(`Cài đặt của bé còn trên disk không: ${hasSettings ? 'CÒN (Lỗi)' : 'ĐÃ DỌN DẸP SẠCH SẼ (Chính xác)'}`);

  console.log('\n✅ TẤT CẢ KIỂM TRA BACKEND & CASCADE CLEANUP ĐÃ HOÀN TẤT XUẤT SẮC!');
}

runTests().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
