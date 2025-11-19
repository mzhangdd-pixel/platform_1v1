# 🎮 快速开始 - Switch 手柄控制

## 5 分钟上手指南

### 1️⃣ 连接手柄

**Windows 用户:**
```
1. 长按 Switch 手柄顶部的配对按钮 (3秒)
2. 打开 Windows 设置 → 蓝牙和其他设备 → 添加设备
3. 选择 "Pro Controller" 进行连接
```

**Mac 用户:**
```
1. 系统偏好设置 → 蓝牙
2. 长按手柄配对按钮
3. 点击 "Pro Controller" 连接
```

### 2️⃣ 验证连接

访问测试网站: **[https://gamepad-tester.com/](https://gamepad-tester.com/)**

按任意按键，确认手柄被识别 ✅

### 3️⃣ 启动游戏

1. 打开浏览器访问游戏页面
2. 看到提示: **"🎮 P1 手柄已连接"**
3. 选择角色开始游戏!

---

## 🎯 按键说明

| 操作 | Switch 按键 | 键盘 |
|:-----|:-----------|:-----|
| 移动 | 右摇杆 ← → | A / D |
| 跳跃 | B 键 | W |
| 攻击 | A 键 | X |
| 技能 | Y 键 | C |
| 大招 | X 键 | V |
| 换位 | ZL 键 | F |

---

## ❓ 常见问题

**Q: 手柄没反应?**
- 刷新页面 (Ctrl + F5)
- 使用 Chrome/Edge 浏览器
- 检查手柄是否在系统中识别

**Q: Windows 无法识别 Switch 手柄?**
- 安装 Steam 并启用 "Switch Pro 支持"
- 或下载 [BetterJoy](https://github.com/Davidobot/BetterJoy/releases)

**Q: 摇杆总是漂移?**
- 打开 `gamepad-handler.js`
- 将 `RADIAL_DEADZONE = 0.15` 改为 `0.20`

**Q: 可以同时用键盘和手柄吗?**
- ✅ 可以! 手柄输入优先

---

## 📖 完整文档

详细配置和故障排除请查看: **[GAMEPAD_GUIDE.md](./GAMEPAD_GUIDE.md)**

---

**祝游戏愉快! 🎮✨**
