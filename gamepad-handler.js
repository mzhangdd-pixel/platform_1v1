/**
 * GamepadHandler - Switch 手柄控制系统
 * 实现基于 W3C Gamepad API 的轮询机制和径向死区算法
 *
 * 技术规范参考:
 * - W3C Gamepad API Specification
 * - 轮询机制: requestAnimationFrame 驱动 (2.2节)
 * - 死区算法: 径向死区 + 重归一化 (5.1.2节)
 */

class GamepadHandler {
    constructor(playerIndex = 0) {
        this.playerIndex = playerIndex; // 玩家索引 (0 = P1, 1 = P2)
        this.gamepadIndex = null; // 手柄在 navigator.getGamepads() 中的索引
        this.isConnected = false;
        this.pollingId = null;

        // 死区配置
        this.RADIAL_DEADZONE = 0.15; // 径向死区阈值 (推荐值: 0.15)
        this.BUTTON_THRESHOLD = 0.5; // 按钮触发阈值

        // 按钮状态追踪（防止连续触发 - 边沿检测）
        this.buttonStates = {
            jump: false,      // Button 0 (B键)
            attack: false,    // Button 1 (A键)
            skill: false,     // Button 2 (Y键)
            ultimate: false,  // Button 3 (X键)
            swap: false       // Button 6 (ZL键)
        };

        // W3C 标准按键映射 (Switch 物理布局)
        this.BUTTON_MAP = {
            JUMP: 0,       // B键 (底部面板 - South button)
            ATTACK: 1,     // A键 (右侧面板 - East button)
            SKILL: 2,      // Y键 (左侧面板 - West button)
            ULTIMATE: 3,   // X键 (顶部面板 - North button)
            SWAP: 6        // ZL键 (左扳机 - Left trigger)
        };

        // 摇杆轴映射
        this.AXIS_MAP = {
            MOVE_X: 2,     // 右摇杆 X轴 (水平移动)
            MOVE_Y: 3      // 右摇杆 Y轴 (保留，可用于瞄准)
        };

        // 绑定生命周期事件
        this.onConnect = this.onConnect.bind(this);
        this.onDisconnect = this.onDisconnect.bind(this);

        window.addEventListener('gamepadconnected', this.onConnect);
        window.addEventListener('gamepaddisconnected', this.onDisconnect);

        // 检查是否有已连接的手柄 (页面加载时手柄已连接的情况)
        this.checkExistingGamepads();
    }

    /**
     * 检查已连接的手柄 (处理页面加载时手柄已连接的情况)
     */
    checkExistingGamepads() {
        const gamepads = navigator.getGamepads();
        if (!gamepads) return;

        // 检查全局分配列表 (如果存在)
        const allocatedIndices = window.allocatedGamepadIndices || new Set();

        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            // 找到未被分配的手柄
            if (gamepad && this.gamepadIndex === null && !allocatedIndices.has(gamepad.index)) {
                this.gamepadIndex = gamepad.index;
                this.isConnected = true;
                allocatedIndices.add(gamepad.index);
                this.showConnectionStatus(true);
                break;
            }
        }
    }

    /**
     * 手柄连接事件处理 (3.2节 - Lifecycle Events)
     */
    onConnect(event) {
        // 检查全局分配列表
        const allocatedIndices = window.allocatedGamepadIndices || new Set();

        // 只绑定未分配的手柄
        if (this.gamepadIndex === null && !allocatedIndices.has(event.gamepad.index)) {
            this.gamepadIndex = event.gamepad.index;
            this.isConnected = true;
            allocatedIndices.add(event.gamepad.index);
            this.showConnectionStatus(true);
        }
    }

    /**
     * 手柄断开事件处理
     */
    onDisconnect(event) {
        if (event.gamepad.index === this.gamepadIndex) {
            // 从全局分配列表中移除
            const allocatedIndices = window.allocatedGamepadIndices || new Set();
            allocatedIndices.delete(this.gamepadIndex);

            this.gamepadIndex = null;
            this.isConnected = false;
            this.showConnectionStatus(false);
        }
    }

    /**
     * 径向死区算法 (Radial Deadzone)
     * 参考: W3C Gamepad API 规范 5.1.2 节
     *
     * 原理:
     * 1. 计算输入向量的幅度 (magnitude = √(x² + y²))
     * 2. 如果幅度 < 死区阈值，输出 (0, 0)
     * 3. 否则，重归一化到 [0, 1] 范围: (magnitude - deadzone) / (1 - deadzone)
     * 4. 保持原始方向，应用归一化后的幅度
     *
     * @param {number} x - 摇杆 X 轴原始值 [-1, 1]
     * @param {number} y - 摇杆 Y 轴原始值 [-1, 1]
     * @returns {Object} { x: normalizedX, y: normalizedY, magnitude: radius }
     */
    applyRadialDeadzone(x, y) {
        // 计算输入向量的幅度（半径）
        const magnitude = Math.sqrt(x * x + y * y);

        // 如果幅度小于死区阈值，视为无输入（消除漂移）
        if (magnitude < this.RADIAL_DEADZONE) {
            return { x: 0, y: 0, magnitude: 0 };
        }

        // 重归一化：将死区外的输入映射到 [0, 1] 范围
        // 公式: normalized = (magnitude - deadzone) / (1 - deadzone)
        const normalizedMagnitude = (magnitude - this.RADIAL_DEADZONE) / (1 - this.RADIAL_DEADZONE);

        // 限制最大值为 1.0（防止溢出）
        const clampedMagnitude = Math.min(normalizedMagnitude, 1.0);

        // 保持原始方向，应用归一化后的幅度
        const scale = clampedMagnitude / magnitude;

        return {
            x: x * scale,
            y: y * scale,
            magnitude: clampedMagnitude
        };
    }

    /**
     * 启动轮询机制 (requestAnimationFrame 驱动)
     * 参考: 2.2节 - Polling Mechanism
     *
     * 重要: 必须使用轮询而非事件监听，以确保输入与渲染循环同步
     */
    startPolling(character) {
        if (this.pollingId !== null) {
            return;
        }

        this.character = character;

        const poll = () => {
            this.processInput();
            this.pollingId = requestAnimationFrame(poll);
        };

        this.pollingId = requestAnimationFrame(poll);
    }

    /**
     * 停止轮询
     */
    stopPolling() {
        if (this.pollingId !== null) {
            cancelAnimationFrame(this.pollingId);
            this.pollingId = null;
        }
    }

    /**
     * 核心输入处理函数（每帧调用）
     * 使用 navigator.getGamepads() 获取最新状态快照
     */
    processInput() {
        if (!this.isConnected || this.gamepadIndex === null || !this.character) {
            return;
        }

        // 获取手柄状态快照 (State Snapshot)
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadIndex];

        if (!gamepad) {
            return;
        }

        // ========== 摇杆输入处理 (右摇杆移动) ==========
        const rawX = gamepad.axes[this.AXIS_MAP.MOVE_X] || 0;
        const rawY = gamepad.axes[this.AXIS_MAP.MOVE_Y] || 0;

        // 应用径向死区算法
        const filtered = this.applyRadialDeadzone(rawX, rawY);

        // 传递归一化的 X 轴值给角色移动函数
        if (this.character && this.character.moveGamepad) {
            this.character.moveGamepad(filtered.x);
        }

        // ========== 按钮输入处理 (边沿触发) ==========
        this.processButton('jump', this.BUTTON_MAP.JUMP, gamepad, () => {
            if (this.character.jumpGamepad) this.character.jumpGamepad();
        });

        this.processButton('attack', this.BUTTON_MAP.ATTACK, gamepad, () => {
            if (this.character.attackGamepad) this.character.attackGamepad();
        });

        this.processButton('skill', this.BUTTON_MAP.SKILL, gamepad, () => {
            if (this.character.useSkillGamepad) this.character.useSkillGamepad();
        });

        this.processButton('ultimate', this.BUTTON_MAP.ULTIMATE, gamepad, () => {
            if (this.character.useUltimateGamepad) this.character.useUltimateGamepad();
        });

        this.processButton('swap', this.BUTTON_MAP.SWAP, gamepad, () => {
            if (this.character.switchPositionGamepad) this.character.switchPositionGamepad();
        });
    }

    /**
     * 处理单个按钮（边沿检测，防止连续触发）
     *
     * @param {string} stateName - 按钮状态名称
     * @param {number} buttonIndex - W3C 标准按钮索引
     * @param {Gamepad} gamepad - 手柄对象
     * @param {Function} callback - 按下时的回调函数
     */
    processButton(stateName, buttonIndex, gamepad, callback) {
        const button = gamepad.buttons[buttonIndex];
        if (!button) return;

        const isPressed = button.pressed || button.value > this.BUTTON_THRESHOLD;

        // 边沿触发：只在按下瞬间执行一次（上升沿）
        if (isPressed && !this.buttonStates[stateName]) {
            callback();
            this.buttonStates[stateName] = true;
        }
        // 下降沿：释放时重置状态
        else if (!isPressed && this.buttonStates[stateName]) {
            this.buttonStates[stateName] = false;
        }
    }

    /**
     * 显示手柄连接状态提示（UI 反馈）
     */
    showConnectionStatus(connected) {
        const playerName = this.playerIndex === 0 ? 'P1' : 'P2';
        const message = connected
            ? `🎮 ${playerName} 手柄已连接`
            : `❌ ${playerName} 手柄已断开`;

        // 创建临时提示元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            ${this.playerIndex === 0 ? 'left: 20px;' : 'right: 20px;'}
            background: ${connected ? '#34c759' : '#ff3b30'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * 清理资源（销毁时调用）
     */
    destroy() {
        this.stopPolling();
        window.removeEventListener('gamepadconnected', this.onConnect);
        window.removeEventListener('gamepaddisconnected', this.onDisconnect);
    }
}
