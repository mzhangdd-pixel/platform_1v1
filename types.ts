export interface CharacterConfig {
    name: string;
    icon: string;
    hp: number;
    color: string;
    resourceType: string;
    maxResource: number;
    desc: string;
    atkCost?: number;
    atkDmg: number;
    skillCost?: number;
    ultCost?: number;
}

export interface Platform {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'ground' | 'platform';
    level: number;
    effect?: 'jump' | 'slow' | 'speed';
}

export interface Popup {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
}

export interface SelectionState {
    index: number;
    confirmed: boolean;
}

export type PlayerId = 1 | 2;

// For passing UI state from game loop to React
export interface GameUIState {
    p1: PlayerUIInfo;
    p2: PlayerUIInfo;
    timer: string;
    gamepadStatus: {
        p1: boolean;
        p2: boolean;
    };
}

export interface PlayerUIInfo {
    hp: number;
    maxHp: number;
    lives: number;
    resource: number;
    maxResource: number;
    name: string;
    icon: string;
    cdAtk: number;
    cdSkill: number;
    cdUlt: number;
    cdSwap: number;
    cdAtkMax: number;
    cdSkillMax: number;
    cdUltMax: number;
    cdSwapMax: number;
}