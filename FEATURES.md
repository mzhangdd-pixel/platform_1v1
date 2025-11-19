# 🎮 功能特性详解

## 1. 手柄控制系统

### 1.1 核心架构

```
用户输入 (Switch 手柄)
    ↓
navigator.getGamepads() [每帧轮询]
    ↓
径向死区滤波 (0.15 阈值)
    ↓
边沿检测 (防止连续触发)
    ↓
Player 方法调用
    ↓
游戏物理引擎
```

### 1.2 技术亮点

#### ✨ 轮询机制 (Polling)
- **为什么不用事件?** 事件监听有延迟,无法与渲染循环同步
- **实现方式**: `requestAnimationFrame` 驱动,每帧调用 `navigator.getGamepads()`
- **性能**: 60 FPS 稳定,延迟 < 16ms

#### ✨ 径向死区算法 (Radial Deadzone)

**传统方形死区的问题:**
```
   ┌────────────┐
   │            │
   │   ┌────┐   │  ← 方形死区
   │   │ XX │   │    角落存在盲区
   │   └────┘   │
   │            │
   └────────────┘
```

**我们的径向死区:**
```
   ┌────────────┐
   │            │
   │    ●●●●    │  ← 圆形死区
   │  ●      ●  │    完美覆盖
   │    ●●●●    │
   │            │
   └────────────┘
```

**算法公式:**
```javascript
magnitude = √(x² + y²)
if (magnitude < 0.15) return (0, 0)
normalized = (magnitude - 0.15) / (1 - 0.15)
output = (x × normalized/magnitude, y × normalized/magnitude)
```

**效果对比:**
| 摇杆位置 | 原始值 | 方形死区 | 径向死区 |
|:--------|:------|:--------|:--------|
| 中心 | (0.05, 0.05) | (0.05, 0.05) ❌ | (0, 0) ✅ |
| 轻推 | (0.10, 0.10) | (0.10, 0.10) ❌ | (0, 0) ✅ |
| 正常 | (0.50, 0.00) | (0.50, 0.00) | (0.41, 0.00) |
| 全推 | (1.00, 0.00) | (1.00, 0.00) | (1.00, 0.00) |

#### ✨ 边沿检测 (Edge Detection)

**问题:** 按住按钮会连续触发动作
```
按钮状态:  ____┌───────┐____
           0   1 1 1 1 1 0
触发次数:      ↑ ↑ ↑ ↑ ↑     ← 错误! 触发了 5 次
```

**我们的解决方案:**
```
按钮状态:  ____┌───────┐____
           0   1 1 1 1 1 0
触发次数:      ↑             ← 正确! 只触发 1 次 (上升沿)
```

**代码实现:**
```javascript
if (isPressed && !previousState) {
    callback(); // 只在上升沿触发
    previousState = true;
} else if (!isPressed) {
    previousState = false; // 下降沿重置
}
```

### 1.3 键盘手柄共存

**设计理念:** 玩家可以自由选择输入方式

**优先级规则:**
1. 手柄摇杆有输入 → 使用手柄
2. 手柄摇杆无输入 → 使用键盘
3. 按键动作: 两者都可触发 (独立)

**代码实现:**
```javascript
// 键盘输入 (原始逻辑)
if (keys['a']) vx = -speed;
if (keys['d']) vx = speed;

// 手柄输入 (优先级更高)
if (Math.abs(gamepadVx) > 0.01) {
    vx = gamepadVx; // 覆盖键盘输入
}
```

---

## 2. 按键映射原理

### 2.1 W3C 标准映射

**标准布局 (Xbox 为基准):**
```
       [3]           ┌─────────┐
    [2]   [1]        │   🎮    │
       [0]           │ Standard│
                     │ Gamepad │
    ┌─────────┐      └─────────┘
    │  D-Pad  │
    └─────────┘
Axis 0,1: 左摇杆
Axis 2,3: 右摇杆
```

### 2.2 Switch 手柄适配

**物理按键 → W3C 索引:**
```
Switch 手柄外观:          W3C 标准索引:
      Y(2)                    [3]
   X(3) B(0)               [2]   [0]
      A(1)                    [1]

实际映射关系:
Switch B → Button 0 (底部)
Switch A → Button 1 (右侧)
Switch Y → Button 2 (左侧)
Switch X → Button 3 (顶部)
```

**为什么不同?** Switch 的 A/B 位置与 Xbox 相反,但 W3C 标准以 Xbox 为基准

### 2.3 摇杆轴向选择

**为什么用右摇杆?**
- **传统**: 左摇杆移动 (FPS 游戏习惯)
- **我们**: 右摇杆移动
- **原因**: 2D 横版游戏,右手操作更直观 (左手可放在按键上)

**可自定义:**
```javascript
// 在 gamepad-handler.js 中修改
this.AXIS_MAP = {
    MOVE_X: 0,  // 改为左摇杆 X 轴
    MOVE_Y: 1   // 改为左摇杆 Y 轴
};
```

---

## 3. 连接管理

### 3.1 生命周期

```
手柄插入
  ↓
gamepadconnected 事件
  ↓
保存 gamepad.index
  ↓
显示连接提示
  ↓
开始轮询 (startPolling)
  ↓
每帧处理输入
  ↓
gamepaddisconnected 事件
  ↓
停止轮询 (stopPolling)
  ↓
显示断开提示
```

### 3.2 多手柄支持

**当前实现:** 仅支持 Player 1
```javascript
const p1Handler = new GamepadHandler(0); // Player 1
p1Handler.startPolling(players[0]);
```

**扩展到 Player 2:**
```javascript
const p1Handler = new GamepadHandler(0);
const p2Handler = new GamepadHandler(1);
p1Handler.startPolling(players[0]);
p2Handler.startPolling(players[1]);
```

**自动分配手柄:**
```javascript
let nextPlayerIndex = 0;
window.addEventListener('gamepadconnected', (e) => {
    if (nextPlayerIndex < 2) {
        const handler = new GamepadHandler(nextPlayerIndex);
        handler.gamepadIndex = e.gamepad.index;
        handler.startPolling(players[nextPlayerIndex]);
        nextPlayerIndex++;
    }
});
```

---

## 4. 性能优化

### 4.1 轮询开销

**每帧操作:**
```
1. navigator.getGamepads() - 从底层读取状态
2. 死区计算 - 2 次乘法, 1 次开方, 3 次除法
3. 按钮检查 - 5 个按钮 × 2 次比较
4. 回调函数 - 最多 6 个方法调用
```

**总耗时:** < 0.1ms (现代浏览器)

### 4.2 内存占用

**对象大小:**
- GamepadHandler 实例: ~2 KB
- 按钮状态缓存: 40 bytes
- 事件监听器: 2 个函数引用

**总内存:** < 5 KB per player

### 4.3 垃圾回收

**避免每帧创建对象:**
```javascript
// ❌ 错误 - 每帧创建新对象
processInput() {
    const filtered = { x: 0, y: 0 };
    // ...
}

// ✅ 正确 - 复用对象
constructor() {
    this.cachedVector = { x: 0, y: 0 };
}
processInput() {
    this.cachedVector.x = filtered.x;
    // ...
}
```

---

## 5. 浏览器兼容性

### 5.1 API 支持

| 功能 | Chrome | Edge | Firefox | Safari |
|:-----|:-------|:-----|:--------|:-------|
| navigator.getGamepads() | ✅ 21+ | ✅ 12+ | ✅ 29+ | ✅ 10.1+ |
| gamepadconnected 事件 | ✅ 35+ | ✅ 12+ | ✅ 29+ | ⚠️ 14+ |
| Axis 值精度 | ✅ Full | ✅ Full | ✅ Full | ⚠️ Limited |

### 5.2 手柄识别

**标准模式 (mapping: "standard"):**
- ✅ Xbox One/Series
- ✅ PlayStation 4/5 (需 DS4Windows on Windows)
- ⚠️ Switch Pro (需第三方驱动)
- ✅ 通用 HID 手柄

**检测代码:**
```javascript
const gp = navigator.getGamepads()[0];
if (gp.mapping === 'standard') {
    console.log('标准映射支持');
} else {
    console.warn('非标准映射,可能需要自定义');
}
```

---

## 6. 调试工具

### 6.1 浏览器控制台日志

**启用详细日志:**
```javascript
// 在 gamepad-handler.js 开头添加
const DEBUG = true;

processInput() {
    if (DEBUG) {
        console.log('Axis X:', rawX, '→', filtered.x);
        console.log('Buttons:', gamepad.buttons.map(b => b.pressed));
    }
}
```

### 6.2 在线测试工具

1. **Gamepad Tester**: https://gamepad-tester.com/
   - 查看所有按钮和轴的实时值
   - 测试死区效果

2. **HTML5 Gamepad Tester**: https://html5gamepad.com/
   - 可视化摇杆输入
   - 检测延迟

3. **Chrome DevTools**:
   ```javascript
   // 控制台中运行
   setInterval(() => {
       const gp = navigator.getGamepads()[0];
       if (gp) console.table({
           'Left X': gp.axes[0],
           'Left Y': gp.axes[1],
           'Right X': gp.axes[2],
           'Right Y': gp.axes[3]
       });
   }, 100);
   ```

---

## 7. 常见问题解决方案

### 7.1 摇杆漂移

**症状:** 角色自动移动,无法停止

**原因:** 死区阈值过小

**解决:**
```javascript
// 增大死区
this.RADIAL_DEADZONE = 0.20; // 从 0.15 增加到 0.20
```

### 7.2 按键延迟

**症状:** 按键响应慢

**可能原因:**
1. 浏览器 V-Sync 未启用
2. 系统驱动冲突 (Steam, DS4Windows)
3. 蓝牙延迟

**解决:**
```bash
# 1. 启用硬件加速 (Chrome)
chrome://settings → 系统 → 使用硬件加速

# 2. 关闭冲突软件
关闭 Steam 大屏幕模式
退出 DS4Windows

# 3. 使用有线连接
USB-C 线缆连接手柄
```

### 7.3 手柄未识别

**检查清单:**
```javascript
// 1. 浏览器支持
if (!('getGamepads' in navigator)) {
    console.error('浏览器不支持 Gamepad API');
}

// 2. 手柄连接
const gamepads = navigator.getGamepads();
console.log('已连接手柄:', gamepads.filter(gp => gp !== null));

// 3. 权限
// 某些浏览器需要用户交互后才能访问手柄
document.addEventListener('click', () => {
    const gp = navigator.getGamepads()[0];
    console.log('手柄状态:', gp);
});
```

---

## 8. 扩展功能

### 8.1 震动反馈 (Haptics)

**API 支持:**
```javascript
if (gamepad.vibrationActuator) {
    // 双马达震动
    gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: 200,
        weakMagnitude: 0.5,
        strongMagnitude: 1.0
    });
}
```

**集成到游戏:**
```javascript
// 在 takeDamage 中添加
takeDamage(amount) {
    // ... 原有逻辑

    // 震动反馈
    const handler = gamepadHandlers.find(h => h.character === this);
    if (handler && handler.isConnected) {
        const gp = navigator.getGamepads()[handler.gamepadIndex];
        gp?.vibrationActuator?.playEffect('dual-rumble', {
            duration: 100,
            weakMagnitude: amount / this.maxHp,
            strongMagnitude: amount / this.maxHp
        });
    }
}
```

### 8.2 陀螺仪控制

**读取陀螺仪数据:**
```javascript
// PlayStation 手柄支持
if (gamepad.axes.length >= 6) {
    const gyroX = gamepad.axes[4];  // 俯仰
    const gyroY = gamepad.axes[5];  // 偏航
    // 可用于瞄准或平衡玩法
}
```

### 8.3 自定义按键映射

**UI 配置界面:**
```javascript
const keyBindings = {
    jump: 0,    // 默认 B 键
    attack: 1,  // 默认 A 键
    // ...
};

function remapButton(action, newButtonIndex) {
    keyBindings[action] = newButtonIndex;
    localStorage.setItem('gamepadBindings', JSON.stringify(keyBindings));
}
```

---

**更多技术细节请参考:**
- [W3C Gamepad API 规范](https://w3c.github.io/gamepad/)
- [MDN Gamepad API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
