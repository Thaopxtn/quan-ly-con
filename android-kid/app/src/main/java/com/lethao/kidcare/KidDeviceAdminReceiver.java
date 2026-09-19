package com.lethao.kidcare;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class KidDeviceAdminReceiver extends DeviceAdminReceiver {
    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Toast.makeText(context, "KidCare: Đã kích hoạt quyền Quản trị viên thiết bị an toàn", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        return "Cảnh báo: Hủy quyền Quản trị viên sẽ làm mất tính năng bảo vệ trẻ em và gửi thông báo khẩn cấp đến cha mẹ!";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Toast.makeText(context, "KidCare: Quyền quản trị đã bị hủy", Toast.LENGTH_SHORT).show();
    }
}
