/**
 * Gamepad Integration Patch
 * 为 Player 类添加手柄控制方法
 *
 * 使用方法: 在 index.html 的 </body> 前添加:
 * <script src="gamepad-handler.js"></script>
 * <script src="gamepad-integration.js"></script>
 */

// 全局手柄管理器
let gamepadHandlers = [];

// 页面加载时立即初始化手柄监听 (用于显示连接提示)
(function() {
    // 创建一个临时 handler 用于显示连接提示
    const tempHandler = new GamepadHandler(0);

    // 不启动轮询,只用于连接提示
    console.log('[Gamepad Integration] 手柄监听已启动 (等待连接)');
})();

// 扩展 Player 类的原型，添加手柄控制方法
(function() {
    // 等待 Player 类定义
    if (typeof Player === 'undefined') {
        console.warn('[Gamepad Integration] Player 类尚未定义,等待加载...');

        // 使用 MutationObserver 或轮询等待
        const checkInterval = setInterval(() => {
            if (typeof Player !== 'undefined') {
                clearInterval(checkInterval);
                console.log('[Gamepad Integration] Player 类已加载,开始注入手柄方法');
                injectGamepadMethods();
            }
        }, 100);
        return;
    }

    // 立即注入
    injectGamepadMethods();
})();

// 注入手柄控制方法
function injectGamepadMethods() {
    // 保存原始 update 方法
    const originalUpdate = Player.prototype.update;

    // 添加手柄移动方法
    Player.prototype.moveGamepad = function(normalizedX) {
        if (this.lives <= 0 || this.isLocked()) return;

        let speed = BASE_SPEED;
        if (this.buffSpeed) speed *= 2;
        if (this.raging > 0) speed *= 2;
        if (this.debuffSlow) speed /= 2;

        // 使用摇杆输入控制移动 (覆盖键盘输入)
        this.gamepadVx = normalizedX * speed;

        // 更新朝向
        if (Math.abs(normalizedX) > 0.1) {
            this.dir = normalizedX > 0 ? 1 : -1;
        }
    };

    // 添加手柄跳跃方法
    Player.prototype.jumpGamepad = function() {
        if (this.lives <= 0 || this.isLocked() || !this.grounded) return;

        let jumpPower = BASE_JUMP;
        if (this.buffJump) jumpPower *= 1.5;
        this.vy = jumpPower;
        this.grounded = false;
        this.platform = null;
    };

    // 添加手柄攻击方法
    Player.prototype.attackGamepad = function() {
        if (this.lives <= 0 || this.isLocked() || this.cdAtk > 0) return;
        this.attack();
    };

    // 添加手柄技能方法
    Player.prototype.useSkillGamepad = function() {
        if (this.lives <= 0 || this.isLocked() || this.cdSkill > 0) return;
        this.useSkill();
    };

    // 添加手柄大招方法
    Player.prototype.useUltimateGamepad = function() {
        if (this.lives <= 0 || this.isLocked() || this.cdUlt > 0) return;
        this.useUlt();
    };

    // 添加手柄换位方法
    Player.prototype.switchPositionGamepad = function() {
        if (this.lives <= 0 || this.isLocked() || this.cdSwap > 0) return;
        this.useSwap();
    };

    // 重写 update 方法，整合手柄输入
    Player.prototype.update = function() {
        // 初始化手柄速度
        if (this.gamepadVx === undefined) this.gamepadVx = 0;

        // 调用原始 update
        originalUpdate.call(this);

        // 手柄输入与键盘输入融合 (支持同时使用)
        // 如果手柄有输入，优先使用手柄，否则使用键盘
        if (Math.abs(this.gamepadVx) > 0.01 && !this.isLocked()) {
            this.vx = this.gamepadVx;
        }
        // 重置手柄速度供下一帧使用
        this.gamepadVx = 0;
    };
}

// 修改 startGame 函数以初始化手柄
(function() {
    const originalStartGame = window.startGame;

    window.startGame = function() {
        // 调用原始 startGame
        originalStartGame.call(this);

        // 清理旧的手柄实例
        gamepadHandlers.forEach(handler => handler.destroy());
        gamepadHandlers = [];

        // 为 Player 1 初始化手柄
        const p1Handler = new GamepadHandler(0);
        p1Handler.startPolling(players[0]);
        gamepadHandlers.push(p1Handler);

        console.log('[Gamepad Integration] 手柄系统已初始化');
    };
})();

// 游戏结束时清理手柄
(function() {
    const originalEndGame = window.endGame;

    window.endGame = function(winnerId) {
        // 停止手柄轮询
        gamepadHandlers.forEach(handler => handler.destroy());
        gamepadHandlers = [];

        // 调用原始 endGame
        originalEndGame.call(this, winnerId);
    };
})();

console.log('[Gamepad Integration] 补丁已加载');
