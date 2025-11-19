# 🎮 Switch 手柄控制指南

## 功能概览

您的双人平台乱斗游戏现已支持 **Switch 手柄**控制！现在可以自由选择使用键盘或手柄进行游戏。

### ✨ 核心特性

- ✅ **低延迟输入**: 采用 `requestAnimationFrame` 驱动的轮询机制
- ✅ **精确摇杆控制**: 实现径向死区算法，消除摇杆漂移
- ✅ **即插即用**: 自动检测手柄连接/断开
- ✅ **键盘手柄共存**: 可同时使用键盘和手柄，手柄输入优先
- ✅ **仅支持 Player 1**: 当前版本为 P1 提供手柄支持

---

## 🎯 按键映射

### Switch 手柄 → 游戏操作

| Switch 按键 | 游戏功能 | W3C 标准索引 | 键盘等效 |
|:-----------|:---------|:------------|:--------|
| **右摇杆 (横向)** | 左右移动 | Axis 2 | A / D |
| **B 键** | 跳跃 | Button 0 | W |
| **A 键** | 普通攻击 | Button 1 | X |
| **Y 键** | 技能 | Button 2 | C |
| **X 键** | 大招 | Button 3 | V |
| **ZL 键** | 换位 | Button 6 | F |

### 🕹️ 操作说明

- **移动**: 推动右摇杆左右移动角色（带方向感应）
- **跳跃**: 按 B 键在地面起跳（可叠加平台跳跃 Buff）
- **攻击**: 按 A 键发动普通攻击
- **技能**: 按 Y 键释放角色专属技能
- **大招**: 按 X 键使用终极技能
- **换位**: 按 ZL 键与对手交换位置

---

## 🖥️ 平台兼容性

### Windows 10/11

#### Switch Pro Controller
1. **蓝牙连接**:
   - 长按手柄顶部的**配对按钮**（3 秒）直到指示灯闪烁
   - 在 Windows 设置中选择"蓝牙和其他设备" → "添加设备"
   - 选择"蓝牙"，找到"Pro Controller"并连接

2. **驱动选项** (推荐):
   - **Steam 方式**:
     - 启动 Steam → 设置 → 控制器 → 启用 "Switch Pro 控制器支持"
     - 推荐用于最佳兼容性
   - **BetterJoy**:
     - 下载 [BetterJoy](https://github.com/Davidobot/BetterJoy/releases)
     - 将 Switch 手柄模拟为 Xbox 手柄

#### Xbox 手柄
- **原生支持**: Windows 自动识别，无需额外驱动
- **建议**: Xbox One/Series X|S 手柄为最佳选择

#### PlayStation 手柄
- **DS4Windows** (DualShock 4): [下载地址](https://ds4-windows.com/)
- **DualSenseX** (DualSense): [下载地址](https://dualsensex.com/)

### macOS

#### Switch Pro Controller
1. **蓝牙连接**:
   - 打开"系统偏好设置" → "蓝牙"
   - 长按手柄配对按钮
   - 点击"Pro Controller"进行连接

2. **驱动支持**:
   - **无需额外驱动**: macOS 原生支持 Switch Pro Controller
   - **Chrome/Safari**: 两款浏览器都支持 Gamepad API

#### Xbox/PlayStation 手柄
- **Xbox**: 需要蓝牙适配器或有线连接
- **PlayStation**: macOS 原生支持蓝牙连接

### 浏览器要求

| 浏览器 | 支持状态 | 推荐版本 |
|:------|:--------|:---------|
| Chrome | ✅ 完美支持 | 90+ |
| Edge | ✅ 完美支持 | 90+ |
| Firefox | ✅ 支持 | 88+ |
| Safari | ⚠️ 部分支持 | 14+ (macOS) |

---

## 🚀 使用方法

### 第一步: 连接手柄
1. 将 Switch 手柄通过蓝牙连接到电脑
2. 确认系统已识别手柄（Windows: 设备管理器 / macOS: 系统偏好设置）

### 第二步: 测试连接
1. 打开浏览器开发者工具 (F12)
2. 访问测试网站: [Gamepad Tester](https://gamepad-tester.com/)
3. 按任意按键，确认手柄被识别

### 第三步: 启动游戏
1. 打开游戏页面 (`index.html`)
2. 看到连接提示: **"🎮 P1 手柄已连接"**
3. 选择角色并开始游戏
4. 现在可以使用手柄控制 Player 1！

### 🎮 游戏中操作
- **键盘/手柄可同时使用**
- **手柄输入优先级更高**（摇杆输入会覆盖键盘移动）
- **自动断开提示**: 手柄断开时会显示 "❌ P1 手柄已断开"

---

## ⚙️ 高级配置

### 死区调整

如果摇杆过于灵敏或迟钝，可以修改死区阈值:

```javascript
// 在 gamepad-handler.js 中修改
this.RADIAL_DEADZONE = 0.15; // 默认值: 0.15 (推荐范围: 0.10 - 0.25)
```

### 支持 Player 2

要为 Player 2 添加手柄支持，修改 `gamepad-integration.js`:

```javascript
// 在 startGame 函数中添加
const p2Handler = new GamepadHandler(1); // 1 = Player 2
p2Handler.startPolling(players[1]);
gamepadHandlers.push(p2Handler);
```

### 自定义按键映射

修改 `gamepad-handler.js` 中的 `BUTTON_MAP`:

```javascript
this.BUTTON_MAP = {
    JUMP: 0,       // 修改为其他按钮索引
    ATTACK: 1,
    // ... 其他映射
};
```

---

## 🐛 故障排除

### 手柄无响应
1. **检查浏览器兼容性**: 使用 Chrome/Edge (推荐)
2. **刷新页面**: 按 `Ctrl + F5` 强制刷新
3. **重新连接手柄**: 断开蓝牙并重新配对
4. **查看控制台**: 按 F12 查看是否有错误信息

### 摇杆漂移
- **调整死区**: 将 `RADIAL_DEADZONE` 从 `0.15` 增加到 `0.20`

### 按键延迟
- **关闭其他程序**: Steam、DS4Windows 等可能造成冲突
- **有线连接**: 使用 USB-C 线缆连接手柄

### Windows 无法识别 Switch 手柄
1. 安装 [BetterJoy](https://github.com/Davidobot/BetterJoy)
2. 或使用 Steam 的"大屏幕模式"自动配置

### macOS Safari 不工作
- **切换到 Chrome**: Safari 的 Gamepad API 支持较弱
- 或更新到最新版 macOS

---

## 🔬 技术细节

### 架构设计

```
┌─────────────────────────────────────────────┐
│         requestAnimationFrame Loop           │
│            (60 FPS 同步)                     │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │ GamepadHandler    │
         │  - 轮询手柄状态    │
         │  - 死区滤波        │
         │  - 边沿检测        │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │ Player Methods     │
         │  - moveGamepad()   │
         │  - jumpGamepad()   │
         │  - attackGamepad() │
         └───────────────────┘
```

### 径向死区算法

```
输入向量 (x, y) → 计算幅度 r = √(x² + y²)
                     ↓
            r < 死区阈值? ──是─→ 输出 (0, 0)
                     ↓ 否
        重归一化: r' = (r - 死区) / (1 - 死区)
                     ↓
        输出 (x × r'/r, y × r'/r)
```

### 为什么使用轮询而非事件?

- **同步性**: `requestAnimationFrame` 确保输入与渲染同步
- **低延迟**: 每帧轮询避免事件队列延迟
- **精确性**: 实时获取摇杆模拟值

---

## 📝 更新日志

### v1.0.0 (2025-01-19)
- ✅ 初始版本
- ✅ 支持 Switch Pro Controller (P1)
- ✅ 实现径向死区算法
- ✅ 键盘手柄共存模式
- ✅ 自动连接/断开检测

---

## 📧 反馈与支持

如有问题或建议，请通过以下方式联系:
- GitHub Issues: [项目仓库](https://github.com/mzhangdd-pixel/platform_1v1)
- 邮箱: [您的邮箱]

---

**享受游戏! 🎮✨**
