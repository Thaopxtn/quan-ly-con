/**
 * Automated Verification Test for KidCare Command & ACK Pipeline
 * 
 * Verifies bidirectional command execution, state synchronization,
 * and execution ACK confirmation between Parent App and Kid Device.
 */

const http = require('http');

const PORT = 3000;
const HOST = 'localhost';
const PARENT_ID = 'yaDXFmTMcccQV6m53Rxtw4LOF303';
const CHILD_ID = 'child_muf02v3g6ce';
const CHILD_NAME = 'Bé yêu';
const DEVICE_NAME = 'Huawei INE-LX2';

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path,
      method: 'POST',
      headers,
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          resolve({ raw: buf, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path,
      method: 'GET',
      headers,
    }, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          resolve({ raw: buf, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASSED: ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTOMATED COMMAND & ACK PIPELINE TESTS');
  console.log('====================================================\n');

  let passedCount = 0;

  // Step 1: Health Check
  console.log('[Step 1/5] Kiểm tra trạng thái máy chủ...');
  const health = await get('/api/health');
  assert(health && health.status === 'ok', `Server đang hoạt động (Uptime: ${health.uptime}s)`);
  passedCount++;

  // Step 2: Authentication
  console.log('\n[Step 2/5] Xác thực bảo mật phân quyền Cha Mẹ...');
  const authRes = await post('/api/auth/token', {}, 'parent_master_secret_2026');
  assert(authRes && authRes.success && authRes.token, 'Nhận SessionToken có chữ ký số hợp lệ');
  const token = authRes.token;
  passedCount++;

  // Step 3: Dispatch Lock Command
  console.log(`\n[Step 3/5] Cha Mẹ gửi lệnh [lock_now] đến máy con (${CHILD_NAME})...`);
  const lockRes = await post('/api/command', {
    childId: CHILD_ID,
    command: 'lock_now',
    type: 'lock_now',
    parentId: PARENT_ID,
    childName: CHILD_NAME,
  }, token);
  assert(lockRes && lockRes.success && lockRes.commandId, `Lệnh khóa được server tiếp nhận với ID: ${lockRes.commandId}`);
  passedCount++;

  const cmdId = lockRes.commandId;
  const cmdsList = await get(`/api/command?childId=${CHILD_ID}`, token);
  const pendingCmd = (cmdsList.commands || []).find(c => c.id === cmdId);
  assert(pendingCmd && pendingCmd.status === 'pending', 'Lệnh ở trạng thái "pending", không tự ý đổi trạng thái ảo trước khi con thực thi');
  passedCount++;

  // Step 4: Kid sends Execution ACK
  console.log(`\n[Step 4/5] Máy con (${DEVICE_NAME}) nhận lệnh, khóa màn hình và gửi ACK xác nhận...`);
  const ackRes = await post('/api/command/ack', {
    id: cmdId,
    commandId: cmdId,
    command: 'lock_now',
    status: 'executed',
    childId: CHILD_ID,
    deviceName: DEVICE_NAME,
    childName: CHILD_NAME,
    detail: 'Đã khóa màn hình thành công trên máy con',
  }, token);
  assert(ackRes && ackRes.success, 'Server xác nhận đã tiếp nhận gói tin ACK từ máy con');
  passedCount++;

  const cmdsAfter = await get(`/api/command?childId=${CHILD_ID}`, token);
  const executedCmd = (cmdsAfter.commands || []).find(c => c.id === cmdId);
  assert(executedCmd && executedCmd.status === 'executed', 'Trạng thái lệnh trên server đã cập nhật thành "executed"');
  passedCount++;

  const settingsAfterLock = await get(`/api/settings?childId=${CHILD_ID}`, token);
  assert(settingsAfterLock?.settings?.isLocked === true, 'Cấu hình thiết bị con được xác nhận: isLocked = true');
  passedCount++;

  // Step 5: Unlock Command & ACK
  console.log(`\n[Step 5/5] Cha Mẹ gửi lệnh [unlock_now] -> Máy con mở khóa & phản hồi...`);
  const unlockRes = await post('/api/command', {
    childId: CHILD_ID,
    command: 'unlock_now',
    type: 'unlock_now',
    parentId: PARENT_ID,
    childName: CHILD_NAME,
  }, token);
  assert(unlockRes && unlockRes.success && unlockRes.commandId, `Lệnh mở khóa được server tiếp nhận: ${unlockRes.commandId}`);
  passedCount++;

  const unlockAckRes = await post('/api/command/ack', {
    id: unlockRes.commandId,
    commandId: unlockRes.commandId,
    command: 'unlock_now',
    status: 'executed',
    childId: CHILD_ID,
    deviceName: DEVICE_NAME,
    childName: CHILD_NAME,
    detail: 'Đã mở khóa màn hình thành công trên máy con',
  }, token);
  assert(unlockAckRes && unlockAckRes.success, 'Máy con gửi phản hồi mở khóa thành công');
  passedCount++;

  const finalSettings = await get(`/api/settings?childId=${CHILD_ID}`, token);
  assert(finalSettings?.settings?.isLocked === false, 'Cấu hình thiết bị con được xác nhận mở: isLocked = false');
  passedCount++;

  console.log('\n====================================================');
  console.log(`🎉 TẤT CẢ ${passedCount}/${passedCount} BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG VÀ CHÍNH XÁC 100%!`);
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err.message);
  process.exit(1);
});
