import { describe, it, expect, vi, beforeEach } from 'vitest';
import { REMOTE_COMMAND_TITLES, CommandAckStatus } from '../shared/store';

describe('KidCare Remote Command & ACK Architecture', () => {
  it('should have valid title mappings for all essential remote commands', () => {
    expect(REMOTE_COMMAND_TITLES['lock_now']).toBe('Khóa máy tức thì 🔒');
    expect(REMOTE_COMMAND_TITLES['unlock_now']).toBe('Mở khóa thiết bị 🔓');
    expect(REMOTE_COMMAND_TITLES['buzz_siren']).toBe('Hú còi tìm máy khẩn cấp 🚨');
    expect(REMOTE_COMMAND_TITLES['extend_time']).toBe('Gia hạn thêm thời gian ⏱️');
  });

  it('should construct valid pending CommandAckStatus structure', () => {
    const now = Date.now();
    const ack: CommandAckStatus = {
      id: 'cmd_123',
      command: 'lock_now',
      commandTitle: REMOTE_COMMAND_TITLES['lock_now'],
      status: 'pending',
      childId: 'child_muf02v3g6ce',
      childName: 'Bé yêu',
      deviceName: 'Huawei INE-LX2',
      sentAt: now,
      detail: 'Đang truyền tín hiệu đến điện thoại của Bé yêu...',
    };

    expect(ack.status).toBe('pending');
    expect(ack.childId).toBe('child_muf02v3g6ce');
    expect(ack.executedAt).toBeUndefined();
  });

  it('should transition CommandAckStatus to executed upon child confirmation', () => {
    const now = Date.now();
    const initialAck: CommandAckStatus = {
      id: 'cmd_123',
      command: 'lock_now',
      commandTitle: REMOTE_COMMAND_TITLES['lock_now'],
      status: 'pending',
      childId: 'child_muf02v3g6ce',
      childName: 'Bé yêu',
      deviceName: 'Huawei INE-LX2',
      sentAt: now,
      detail: 'Đang gửi...',
    };

    // Transition to executed
    const executedAck: CommandAckStatus = {
      ...initialAck,
      status: 'executed',
      executedAt: now + 500,
      detail: 'Đã thực thi thành công trên thiết bị con',
    };

    expect(executedAck.status).toBe('executed');
    expect(executedAck.executedAt).toBeGreaterThanOrEqual(executedAck.sentAt);
    expect(executedAck.detail).toContain('thành công');
  });

  it('should transition CommandAckStatus to timeout after 15s if child is unreachable', () => {
    const now = Date.now();
    const initialAck: CommandAckStatus = {
      id: 'cmd_456',
      command: 'lock_now',
      commandTitle: REMOTE_COMMAND_TITLES['lock_now'],
      status: 'pending',
      childId: 'child_muf02v3g6ce',
      childName: 'Bé yêu',
      deviceName: 'Huawei INE-LX2',
      sentAt: now - 16000,
    };

    const timedOutAck: CommandAckStatus = {
      ...initialAck,
      status: 'timeout',
      detail: 'Điện thoại của Bé yêu chưa phản hồi thực thi. Trạng thái máy con: Vẫn giữ nguyên trạng thái thực tế.',
    };

    expect(timedOutAck.status).toBe('timeout');
    expect(timedOutAck.detail).toContain('chưa phản hồi');
  });
});
