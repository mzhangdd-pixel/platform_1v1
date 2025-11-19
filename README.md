# 双人平台乱斗 (Dual Platformer Brawl)

一款支持 **键盘 + Switch 手柄** 的 HTML5 双人对战游戏!

## ✨ 特性

- 🎮 **Switch 手柄支持** - 低延迟,高精度摇杆控制
- ⌨️ **键盘手柄共存** - 可同时使用两种输入方式
- 🎯 **5 种角色** - 法师、战士、坦克、射手、幽灵
- 🏟️ **多层平台** - 带特殊效果的竞技场
- 💥 **技能系统** - 普通攻击、技能、大招
- 🔄 **换位机制** - 战术性位置交换

## 🎮 手柄控制

**支持设备:** Switch Pro Controller, Xbox 手柄, PlayStation 手柄

### 快速上手

1. **连接手柄** (蓝牙或 USB)
2. **打开游戏** - 看到 "🎮 P1 手柄已连接"
3. **开始游戏!**

### 按键映射

| 操作 | Switch | Xbox | 键盘 |
|:-----|:-------|:-----|:-----|
| 移动 | 右摇杆 | 左摇杆 | A/D |
| 跳跃 | B | A | W |
| 攻击 | A | B | X |
| 技能 | Y | X | C |
| 大招 | X | Y | V |
| 换位 | ZL | LB | F |

📖 **详细指南**: [QUICK_START.md](./QUICK_START.md) | [GAMEPAD_GUIDE.md](./GAMEPAD_GUIDE.md)

## 🕹️ 角色介绍

| 角色 | 图标 | HP | 特点 |
|:-----|:-----|:---|:-----|
| 法师 | 🧙‍♂️ | 4 | 激光炮 / 回魔 |
| 战士 | ⚔️ | 6 | 冲锋 / 狂暴 |
| 坦克 | 🛡️ | 7 | 击退 / 格挡 |
| 射手 | 🔫 | 3 | 翻滚 / 霰弹 |
| 幽灵 | 👻 | 5 | 隐身 / 钩子 |

## 🎯 游戏规则

- **目标**: 耗尽对手 3 条生命
- **平台效果**:
  - 🟢 Level 2: 跳跃力 +50%
  - 🟠 Level 3: 移动速度 -50%
  - 🔵 Level 4: 移动速度 x2 (离开后获得无敌)
- **地刺**: 地面周期性激活,造成伤害

## 🖥️ 平台支持

| 平台 | 手柄驱动 | 浏览器 |
|:-----|:---------|:-------|
| Windows 10/11 | Steam / BetterJoy | Chrome, Edge |
| macOS | 原生支持 | Chrome, Safari |
| Linux | 原生支持 | Chrome, Firefox |

## 🚀 本地运行

```bash
# 克隆仓库
git clone https://github.com/mzhangdd-pixel/platform_1v1.git
cd platform_1v1

# 使用浏览器打开
open index.html  # macOS
start index.html # Windows
```

或访问在线版本: [Vercel 部署地址](#)

## 🛠️ 技术栈

- **Gamepad API**: W3C 标准手柄接口
- **Canvas API**: 2D 渲染引擎
- **requestAnimationFrame**: 60 FPS 游戏循环
- **径向死区算法**: 消除摇杆漂移

## 📁 项目结构

```
platform_1v1/
├── index.html                # 主游戏页面
├── gamepad-handler.js        # 手柄核心逻辑
├── gamepad-integration.js    # 游戏集成代码
├── GAMEPAD_GUIDE.md          # 完整手柄指南
├── QUICK_START.md            # 快速开始
└── README.md                 # 本文档
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 📝 更新日志

### v1.1.0 (2025-01-19)
- ✅ 添加 Switch 手柄支持
- ✅ 实现径向死区算法
- ✅ 键盘手柄共存模式

### v1.0.0 (2025-01-19)
- ✅ 初始版本发布
- ✅ 5 种角色
- ✅ 多层平台系统

## 📄 许可证

MIT License

---

**Made with ❤️ by Claude Code**

🎮 享受游戏!
