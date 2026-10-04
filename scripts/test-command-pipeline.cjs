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

  // Step 6: Test Child Time Request & Parent Approval Auto-Unlock Pipeline
  console.log(`\n[Step 6/6] Kiểm tra quy trình Con xin mở máy -> Cha Mẹ phê duyệt -> Tự động mở khóa...`);
  // 6.1 Khóa lại máy con để kiểm tra
  const lock2Res = await post('/api/command', { childId: CHILD_ID, command: 'lock_now', parentId: PARENT_ID, childName: CHILD_NAME }, token);
  const lock2CmdId = lock2Res?.commandId;
  await post('/api/command/ack', { id: lock2CmdId, commandId: lock2CmdId, command: 'lock_now', status: 'executed', childId: CHILD_ID, deviceName: DEVICE_NAME, childName: CHILD_NAME }, token);
  const midSettings = await get(`/api/settings?childId=${CHILD_ID}`, token);
  assert(midSettings?.settings?.isLocked === true, 'Máy con đang ở trạng thái khóa để thử nghiệm');
  passedCount++;

  // 6.2 Máy con gửi yêu cầu xin mở máy (15 phút)
  const reqTime = await post('/api/time-requests', {
    childId: CHILD_ID,
    childName: CHILD_NAME,
    appName: 'Mở khóa điện thoại',
    requestedMinutes: 15,
    reason: 'Con xin bố mẹ mở máy để học bài ạ',
  }, token);
  assert(reqTime && reqTime.success && reqTime.request?.id, 'Máy con gửi yêu cầu xin mở máy thành công');
  const reqId = reqTime.request.id;
  passedCount++;

  // 6.3 Cha Mẹ phê duyệt yêu cầu (+15 phút)
  const resolveRes = await post('/api/time-requests/resolve', {
    id: reqId,
    childId: CHILD_ID,
    status: 'approved',
    approvedMinutes: 15,
  }, token);
  assert(resolveRes && resolveRes.success && resolveRes.request?.status === 'approved', 'Cha Mẹ phê duyệt yêu cầu thành công trên server');
  passedCount++;

  // 6.4 Kiểm tra server đã tự động cập nhật settings (isLocked = false, giới hạn mới >= dùng + 15p)
  const afterApproveSettings = await get(`/api/settings?childId=${CHILD_ID}`, token);
  assert(afterApproveSettings?.settings?.isLocked === false, 'Server tự động giải phóng khóa máy: isLocked = false');
  passedCount++;
  assert(afterApproveSettings?.settings?.screenTimeLimitMinutes >= 15, 'Server tự động gia hạn thời gian sử dụng an toàn');
  passedCount++;

  // 6.5 Kiểm tra server đã tự động tạo và đẩy lệnh unlock_now vào remote_commands queue
  const pendingUnlockCmds = await get(`/api/command?childId=${CHILD_ID}`, token);
  const autoUnlockCmd = (pendingUnlockCmds.commands || []).find(c => c.command === 'unlock_now' && (c.payload?.source === 'time_request_approved' || c.payload?.minutes === 15));
  assert(Boolean(autoUnlockCmd), 'Server tự động tạo lệnh [unlock_now] trong hàng đợi để máy con nhận qua polling/SSE');
  passedCount++;

  // 6.6 Máy con nhận lệnh và gửi ACK executed
  if (autoUnlockCmd) {
    const autoAck = await post('/api/command/ack', {
      id: autoUnlockCmd.id,
      commandId: autoUnlockCmd.id,
      command: 'unlock_now',
      status: 'executed',
      childId: CHILD_ID,
      deviceName: DEVICE_NAME,
      childName: CHILD_NAME,
      detail: 'Đã mở khóa màn hình sau khi phụ huynh phê duyệt yêu cầu',
    }, token);
    assert(autoAck && autoAck.success, 'Máy con gửi ACK thực thi mở khóa thành công');
    passedCount++;
  }

  console.log('\n====================================================');
  console.log(`🎉 TẤT CẢ ${passedCount}/${passedCount} BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG VÀ CHÍNH XÁC 100%!`);
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err.message);
  process.exit(1);
});
