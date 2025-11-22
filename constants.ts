import { CharacterConfig, Platform } from './types';

export const CANVAS_W = 1000;
export const CANVAS_H = 700;
export const GRAVITY = 0.8;
export const BASE_SPEED = 5;
export const BASE_JUMP = -16.0; 
export const SWAP_COOLDOWN = 600; 

export const CHARACTERS: Record<string, CharacterConfig> = {
    mage: { 
        name: "法师", icon: "🧙‍♂️", hp: 4, color: "#5ac8fa", resourceType: "mana", maxResource: 100, 
        desc: "激光炮 / 蓄力普攻", atkCost: 10, atkDmg: 1, ultCost: 60
    },
    warrior: { 
        name: "战士", icon: "⚔️", hp: 5, color: "#ff3b30", resourceType: "rage", maxResource: 100, 
        desc: "冲锋 / 狂暴", atkCost: 0, atkDmg: 1, skillCost: 30, ultCost: 80
    },
    tank: { 
        name: "坦克", icon: "🛡️", hp: 6, color: "#34c759", resourceType: "cooldown", maxResource: 100, 
        desc: "击退 / 概率格挡", atkCost: 0, atkDmg: 1
    },
    marksman: { 
        name: "射手", icon: "🔫", hp: 4, color: "#ffcc00", resourceType: "energy", maxResource: 100, 
        desc: "翻滚 / 霰弹", atkCost: 5, atkDmg: 1, skillCost: 25, ultCost: 60
    },
    ghost: { 
        name: "幽灵", icon: "👻", hp: 1, color: "#af52de", resourceType: "cooldown", maxResource: 100, 
        desc: "隐身 / 钩子", atkCost: 0, atkDmg: 1
    },
    gambler: {
        name: "赌徒", icon: "🎲", hp: 5, color: "#d4af37", resourceType: "cooldown", maxResource: 100,
        desc: "飞牌 / 命运轮盘 / 孤注一掷", atkCost: 0, atkDmg: 1
    },
    demolitionist: {
        name: "爆破专家", icon: "💣", hp: 5, color: "#ff9500", resourceType: "ammo", maxResource: 3,
        desc: "榴弹 / C4陷阱 / 地毯式轰炸", atkCost: 1, atkDmg: 1, skillCost: 1, ultCost: 2
    },
    illusionist: {
        name: "幻术师", icon: "🎭", hp: 5, color: "#ff2d55", resourceType: "cooldown", maxResource: 100,
        desc: "幻光束 / 镜像分身 / 位置置换", atkCost: 0, atkDmg: 0.5, skillCost: 0, ultCost: 0
    },
    paladin: {
        name: "圣骑士", icon: "🛡️", hp: 6, color: "#ffd60a", resourceType: "faith", maxResource: 100,
        desc: "战锤 / 圣光护盾(反弹) / 制裁之光", atkCost: 0, atkDmg: 1, skillCost: 30, ultCost: 70
    },
    chronomancer: {
        name: "时空行者", icon: "⏳", hp: 3, color: "#5e5ce6", resourceType: "energy", maxResource: 100,
        desc: "时间针 / 时间倒流 / 静止力场", atkCost: 0, atkDmg: 1, skillCost: 50, ultCost: 100
    }
};

export const INITIAL_PLATFORMS: Platform[] = [
    { x: 0, y: 650, w: 1000, h: 50, type: 'ground', level: 1 },
    { x: 100, y: 500, w: 200, h: 20, type: 'platform', level: 2, effect: 'jump' },
    { x: 700, y: 500, w: 200, h: 20, type: 'platform', level: 2, effect: 'jump' },
    { x: 0, y: 350, w: 150, h: 20, type: 'platform', level: 3, effect: 'slow' },
    { x: 850, y: 350, w: 150, h: 20, type: 'platform', level: 3, effect: 'slow' },
    { x: 350, y: 200, w: 300, h: 20, type: 'platform', level: 4, effect: 'speed' },
];