import { CANVAS_W, CANVAS_H, GRAVITY, BASE_SPEED, BASE_JUMP, SWAP_COOLDOWN, CHARACTERS } from "../../constants";
import { CharacterConfig } from "../../types";
import { Settings } from "../../utils/settings";
import { soundManager } from "../../utils/soundManager";
import { gameStateInstance } from "../gameState";
import { Particle } from "./Particle";
import { Projectile } from "./Projectile";

export class Player {
    id: number;
    charKey: string;
    stats: CharacterConfig;
    
    x: number; y: number; w: number = 30; h: number = 50;
    vx: number = 0; vy: number = 0;
    grounded: boolean = false; platform: any = null; 
    inputX: number = 0; 
    isAtkHeld: boolean = false;
    
    lives: number = 3;
    maxHp: number;
    hp: number;
    dir: number;
    
    resource: number = 100; 

    cdAtk: number = 0; cdSkill: number = 0; cdUlt: number = 0; cdSwap: number = 0;
    
    invuln: number = 0; 
    buffSpeed: boolean = false; buffJump: boolean = false; debuffSlow: boolean = false;
    buffDuration: number = 0;
    invisible: boolean = false; invisibleTimer: number = 0; 
    charging: boolean = false; chargeTimer: number = 0;
    raging: number = 0; stunned: number = 0; tankUlt: number = 0; nextHitStun: boolean = false; 
    reflecting: number = 0;
    faithRegenTimer: number = 0; 
    
    doubleDamageTimer: number = 0; 
    dropCooldown: number = 0; 
    activeC4: Projectile | null = null; 
    ammoRegenTimer: number = 0; 
    
    // Chronomancer Ammo System
    chronoAmmo: number = 3; // Reduced to 3
    chronoReloadTimer: number = 0;

    // Demolitionist Auto-Detonate
    c4Timer: number = 0;
    
    clone = { active: false, x: 0, y: 0, dir: 1 };
    rouletteAnim: number = 0;

    history: { x: number, y: number, hp: number }[] = []; 

    actionState: string = 'idle'; actionTimer: number = 0; atkAnimTimer: number = 0;
    mageChargingAtk: boolean = false; mageChargeAtkTimer: number = 0;

    // Input mapping (Keys handled externally, but logic is here)
    keys: any;

    constructor(id: number, charKey: string, x: number, y: number) {
        this.id = id;
        this.charKey = charKey;
        this.stats = CHARACTERS[charKey];
        this.x = x; this.y = y;
        
        this.maxHp = this.stats.hp;
        this.hp = this.maxHp;
        this.dir = id === 1 ? 1 : -1;
        
        if (this.charKey === 'demolitionist') this.resource = 3;

        if (id === 1) this.keys = { l:'a', r:'d', u:'w', d:'s', atk:'x', skill:'c', ult:'v', swap:'f' };
        else this.keys = { l:'j', r:'l', u:'i', d:'k', atk:',', skill:'.', ult:'/', swap:';' };
    }

    move(normalizedX: number) { this.inputX = normalizedX; }
    
    jump() {
        if (!this.isLocked() && this.grounded) {
            let jumpPower = BASE_JUMP;
            if (this.buffJump) jumpPower *= 1.5;
            this.vy = jumpPower;
            this.grounded = false;
            this.platform = null;
            soundManager.play('jump', this.id === 1 ? 1 : 0.8);
        }
    }
    
    dropDown() {
        if (!this.isLocked() && this.grounded && this.platform && this.platform.type !== 'ground') {
            this.dropCooldown = 20; 
            this.grounded = false; 
            this.platform = null;
            this.y += 2; 
        }
    }

    isLocked() { return this.stunned > 0 || this.charging || this.actionState !== 'idle'; }

    update(activeKeys: Record<string, boolean>) {
        if (this.lives <= 0) return;
        const gs = gameStateInstance;

        // GOD MODE
        if (Settings.noCooldown) {
            this.resource = (this.charKey === 'demolitionist') ? 3 : 100;
            this.chronoAmmo = 3;
            if(this.cdSkill > 0) this.cdSkill = 0;
            if(this.cdUlt > 0) this.cdUlt = 0;
            if(this.cdSwap > 0) this.cdSwap = 0;
            if(this.cdAtk > 5) this.cdAtk = 5; 
        }

        if (this.invuln > 0) this.invuln--;
        if (this.cdAtk > 0) this.cdAtk--;
        if (this.cdSkill > 0) this.cdSkill--;
        if (this.cdUlt > 0) this.cdUlt--;
        if (this.cdSwap > 0) this.cdSwap--;
        if (this.stunned > 0) this.stunned--;
        if (this.atkAnimTimer > 0) this.atkAnimTimer--;
        if (this.doubleDamageTimer > 0) this.doubleDamageTimer--;
        if (this.dropCooldown > 0) this.dropCooldown--; 
        if (this.reflecting > 0) this.reflecting--;
        
        if (this.charKey === 'chronomancer') {
            this.history.push({ x: this.x, y: this.y, hp: this.hp });
            if (this.history.length > 180) this.history.shift();
            
            // Chronomancer Ammo Logic: 1 charge per sec (60 frames), max 3
            if (this.chronoAmmo < 3) {
                this.chronoReloadTimer++;
                if (this.chronoReloadTimer >= 60) {
                    this.chronoAmmo++;
                    this.chronoReloadTimer = 0;
                }
            }
        }

        // Demolitionist C4 Auto-Detonate Logic
        if (this.charKey === 'demolitionist' && this.activeC4 && this.activeC4.active) {
            this.c4Timer++;
            if (this.c4Timer >= 600) { // 10 seconds at 60fps
                this.useSkill(); // Trigger detonation
            }
        }
        
        if (this.actionState !== 'idle') {
            this.actionTimer--;
            if (this.actionState === 'rolling') this.invuln = 2; 
            else if (this.actionState === 'dashing') {
                let enemy = this.id === 1 ? gs.players[1] : gs.players[0];
                if (enemy && Math.abs((enemy.y + enemy.h/2) - (this.y + this.h/2)) < 60 &&
                    Math.abs((enemy.x + enemy.w/2) - (this.x + this.w/2)) < 60) {
                    enemy.x = this.x + (this.dir * (this.w + 5));
                    enemy.stunned = 2; 
                }
            }
            if (this.actionTimer <= 0) { this.actionState = 'idle'; this.vx = 0; }
        }

        if (this.stunned > 0) { 
            if (this.charKey === 'ghost' && activeKeys[this.keys.skill] && this.cdSkill <= 0) {
                this.useSkill();
            }
            this.vx = 0; 
            this.applyPhysics(); 
            return; 
        }
        
        if (this.charging) {
            this.vx = 0;
            this.chargeTimer--;
            if (Settings.flashyMode) gs.spawnFlashyParticles(this.x+this.w/2, this.y+this.h/2, this.stats.color, 'charge');
            else if (Math.random() < 0.5) gs.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#5ac8fa", 'aura'));
            
            if (this.chargeTimer <= 0) { this.charging = false; this.fireLaser(); }
            if (activeKeys[this.keys.l]) this.vx = -BASE_SPEED * 0.2;
            if (activeKeys[this.keys.r]) this.vx = BASE_SPEED * 0.2;
            this.applyPhysics();
            return;
        }

        if (this.raging > 0) {
             this.raging--;
             if (Settings.flashyMode) gs.particles.push(new Particle(this.x+Math.random()*this.w, this.y-10, "#ff0000", 'rage_face'));
             else if (Math.random() < 0.3) gs.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#ff3b30", 'aura'));
        }
        
        if (this.invisible) {
            this.invisibleTimer--;
            if (this.invisibleTimer <= 0) this.invisible = false;
        }
        if (this.tankUlt > 0) this.tankUlt--;

        if (!Settings.noCooldown) {
            if (this.charKey === 'marksman' && this.resource < 100 && gs.globalTime % 12 === 0) this.resource++;
            if (this.charKey === 'demolitionist' && this.resource < 3) {
                this.ammoRegenTimer++;
                if (this.ammoRegenTimer >= 300) { 
                    this.resource++;
                    this.ammoRegenTimer = 0;
                    gs.addPopup(this.x, this.y - 30, "+1 Ammo", "#ff9500");
                }
            }
            if ((this.charKey === 'paladin' || this.charKey === 'chronomancer') && this.resource < 100) {
                this.faithRegenTimer++; 
                if (this.faithRegenTimer >= 6) {
                    this.resource++;
                    this.faithRegenTimer = 0;
                }
            }
        }

        if (!this.isLocked()) {
            let speed = BASE_SPEED;
            if (this.buffSpeed) speed *= 1.5; 
            if (this.platform && this.platform.level === 4) speed *= 2; 
            if (this.raging > 0) speed *= 2;
            if (this.debuffSlow) speed /= 2;
            this.vx = 0;
            if (activeKeys[this.keys.l]) { this.vx = -speed; this.dir = -1; }
            if (activeKeys[this.keys.r]) { this.vx = speed; this.dir = 1; }
            if (Math.abs(this.inputX) > 0.05) { this.vx = this.inputX * speed; this.dir = this.inputX > 0 ? 1 : -1; }
            if (activeKeys[this.keys.u] && this.grounded) this.jump();
            if (activeKeys[this.keys.d]) this.dropDown();
        }

        this.applyPhysics();
        this.checkMapEffects();
        
        if (!this.isLocked()) {
            const pressingAtk = activeKeys[this.keys.atk] || this.isAtkHeld;
            
            if (this.charKey === 'mage') {
                if (pressingAtk) {
                    this.mageChargingAtk = true;
                    this.mageChargeAtkTimer++;
                    if (this.mageChargeAtkTimer % 10 === 0) {
                        gs.particles.push(new Particle(this.x + Math.random()*this.w, this.y + Math.random()*this.h, "#5ac8fa", 'rune'));
                    }
                } else {
                    if (this.mageChargingAtk) {
                        let dmg = (this.mageChargeAtkTimer > 120) ? 2 : 1;
                        if (this.cdAtk <= 0) this.attack(dmg);
                        this.mageChargingAtk = false;
                        this.mageChargeAtkTimer = 0;
                    }
                }
            } else {
                if (pressingAtk && this.cdAtk <= 0) this.attack();
            }

            if (activeKeys[this.keys.skill] && this.cdSkill <= 0) this.useSkill();
            if (activeKeys[this.keys.ult] && this.cdUlt <= 0) this.useUlt();
            if (activeKeys[this.keys.swap] && this.cdSwap <= 0) this.useSwap();
        }
    }

    applyPhysics() {
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0) this.x = 0;
        if (this.x + this.w > CANVAS_W) this.x = CANVAS_W - this.w;
        this.grounded = false;
        for (let p of gameStateInstance.platforms) {
            if (this.dropCooldown > 0 && p.type !== 'ground') continue;
            
            if (this.vy >= 0 && this.y + this.h >= p.y && this.y + this.h <= p.y + p.h + 10 && this.x + this.w > p.x && this.x < p.x + p.w) {
                this.y = p.y - this.h; this.vy = 0; this.grounded = true; this.platform = p;
            }
        }
    }

    checkMapEffects() {
        const gs = gameStateInstance;
        let onSpecialPlat = false;
        if (this.grounded && this.platform) {
            if (this.platform.level === 2) { this.buffJump = true; onSpecialPlat = true; }
            else if (this.platform.level === 3) { this.debuffSlow = true; onSpecialPlat = true; }
            else if (this.platform.level === 4) { this.buffSpeed = true; onSpecialPlat = true; }
        }
        if (!onSpecialPlat) {
            if (this.charKey !== 'gambler' || (this.charKey === 'gambler' && this.buffDuration <= 0)) {
                 this.buffSpeed = false; 
            }
            this.buffJump = false; this.debuffSlow = false;
        }
        
        if (this.buffDuration > 0) {
            this.buffDuration--;
            if (this.buffDuration <= 0) {
                this.buffSpeed = false;
                gs.addPopup(this.x, this.y, "Buff End", "#ccc");
            }
        }
    }

    takeDamage(amount: number, type = 'normal') {
        if (this.lives <= 0 || this.invuln > 0) return;
        if (type === 'spike' && this.invisible) return;
        const gs = gameStateInstance;

        if (this.tankUlt > 0 && Math.random() < 0.5) {
            gs.addPopup(this.x, this.y, "Blocked!", "#34c759");
            gs.spawnFlashyParticles(this.x+this.w/2, this.y+this.h/2, "#34c759", "hex");
            return;
        }
        
        if (!Settings.noCooldown && this.charKey === 'warrior' && this.resource < 100) this.resource = Math.min(100, this.resource + 5);

        this.hp -= amount;
        if (this.hp < 0) this.hp = 0; 
        
        soundManager.play('hit', 1.0);
        gs.addPopup(this.x, this.y, `-${amount}`, "#ff3b30");
        gs.spawnFlashyParticles(this.x+this.w/2, this.y+this.h/2, "#ff3b30", "hit");
        
        if (this.hp <= 0) this.die();
        else this.invuln = 10;
    }

    die() {
        this.lives--;
        const gs = gameStateInstance;
        gs.addPopup(this.x, this.y, "DEAD", "#ff3b30");
        gs.spawnFlashyParticles(this.x+this.w/2, this.y+this.h/2, this.stats.color, "death");
        if (this.lives > 0) this.respawn();
        else {
            // Trigger Game Over logic centrally in loop
        }
    }

    respawn() {
        if (this.id === 1) { this.x = 50; this.y = 200; } else { this.x = 920; this.y = 200; }
        this.hp = this.maxHp; this.vx = 0; this.vy = 0; this.invuln = 60;
        this.resource = 100; 
        if (this.charKey === 'demolitionist') {
            this.resource = 3; 
            this.activeC4 = null; 
        }
        this.invisible = false; this.raging = 0; this.buffSpeed = false; this.actionState = 'idle'; this.inputX = 0;
        this.doubleDamageTimer = 0;
        this.clone = { active: false, x: 0, y: 0, dir: 1 };
        this.reflecting = 0;
        this.history = [];
        this.chronoAmmo = 3;
    }

    attack(damageOverride: number | null = null) {
        const gs = gameStateInstance;
        if (this.invisible) {
             this.invisible = false;
             gs.addPopup(this.x, this.y, "Revealed!", "#fff");
        }

        if (this.cdAtk > 0) return;
        
        if (!Settings.noCooldown) {
            if (this.charKey === 'mage' && this.resource < 10) { soundManager.play('empty'); return; }
            if (this.charKey === 'marksman' && this.resource < 5) { soundManager.play('empty'); return; }
            if (this.charKey === 'demolitionist' && this.resource < 1) {
                gs.addPopup(this.x, this.y - 20, "No Ammo!", "#ff9500");
                soundManager.play('empty');
                return;
            }
            if (this.charKey === 'chronomancer' && this.chronoAmmo < 1) {
                gs.addPopup(this.x, this.y - 20, "Recharging...", "#5e5ce6");
                soundManager.play('empty');
                return;
            }
        }

        // Standardized cooldown for all characters (0.2s)
        this.cdAtk = 12; 
        this.atkAnimTimer = 15; 

        let startX = this.dir === 1 ? this.x + this.w : this.x;
        let startY = this.y + this.h / 2;
        let baseDmg = damageOverride || 1;
        
        if (this.doubleDamageTimer > 0) {
            baseDmg *= 2;
            if (Math.random() < 0.5) gs.addPopup(this.x, this.y-20, "Double Dmg!", "#af52de");
        }

        if (this.charKey === 'mage') {
            soundManager.play('shoot_magic', this.id === 1 ? 1.2 : 0.8);
            if (!Settings.noCooldown) this.resource -= 10;
            if (damageOverride === 2) {
                gs.spawnFlashyParticles(startX, startY, "#0000ff", "nova");
                gs.addPopup(this.x, this.y, "MAX CHARGE!", "#5ac8fa");
            }
            gs.projectiles.push(new Projectile(startX, startY, this.dir * 8, 0, this.id, baseDmg, 'fireball'));
            if (Settings.flashyMode) gs.spawnFlashyParticles(startX, startY, "#5ac8fa", "rune");
        } else if (this.charKey === 'marksman') {
            soundManager.play('shoot_phys', 1.0);
            if (!Settings.noCooldown) this.resource -= 5;
            gs.projectiles.push(new Projectile(startX, startY, this.dir * 15, 0, this.id, baseDmg, 'bullet'));
            if (Settings.flashyMode) gs.particles.push(new Particle(startX, startY, "#ffaa00", "smoke"));
        } else if (this.charKey === 'warrior') {
            soundManager.play('melee', 1.0);
            this.createMeleeHitbox(60, baseDmg, 0);
            if (!Settings.noCooldown) this.resource = Math.min(100, this.resource + 10);
            if (Settings.flashyMode) gs.spawnFlashyParticles(startX + this.dir*20, startY, "#ff3b30", "slash");
        } else if (this.charKey === 'tank') {
            soundManager.play('melee', 0.8);
            let hit = this.createMeleeHitbox(50, baseDmg, 0);
            if (hit) {
                let enemy = this.id === 1 ? gs.players[1] : gs.players[0];
                enemy.vx = this.dir * 15; enemy.vy = -5;
                if (this.nextHitStun) { enemy.stunned = 30; gs.addPopup(enemy.x, enemy.y, "Stun!", "#34c759"); this.nextHitStun = false; }
            }
        } else if (this.charKey === 'ghost') {
            soundManager.play('shoot_magic', 0.7);
            this.createMeleeHitbox(75, baseDmg, 0); 
        } else if (this.charKey === 'gambler') {
            soundManager.play('shoot_phys', 1.5);
            const offsets = [0, 15, 35, 50]; 
            const suitIndex = Math.floor(Math.random() * 4);
            const spawnY = this.y + offsets[suitIndex];
            gs.projectiles.push(new Projectile(startX, spawnY, this.dir * 12, 0, this.id, baseDmg, 'card', suitIndex));
        } else if (this.charKey === 'demolitionist') {
            soundManager.play('shoot_phys', 0.6);
            if (!Settings.noCooldown) this.resource -= 1;
            
            let enemy = this.id === 1 ? gs.players[1] : gs.players[0];
            
            // Logic: Always arc towards the enemy current position
            let tx = enemy.x + enemy.w/2;
            let ty = enemy.y + enemy.h/2;

            // Physics Calc: Vertex at fixed height relative to jump
            // h_peak = 160 px roughly (BASE_JUMP -16). 
            const vy0 = BASE_JUMP; 
            const g = GRAVITY;
            const dy = ty - startY;
            const dx = tx - startX;
            
            // Solve time to reach target height from launch
            const a = 0.5 * g;
            const b = vy0;
            const c = -dy;
            const discriminant = b*b - 4*a*c;
            
            let t = 0;
            if (discriminant >= 0) {
                // Larger root = time to hit on the way down (or up if close)
                t = (-b + Math.sqrt(discriminant)) / (2*a);
            }
            
            let finalVx = (t > 0) ? dx / t : this.dir * 10;

            gs.projectiles.push(new Projectile(startX, startY, finalVx, vy0, this.id, baseDmg, 'grenade'));
            gs.addPopup(this.x, this.y - 30, `${this.resource} Ammo`, "#ff9500");

        } else if (this.charKey === 'illusionist') {
            soundManager.play('shoot_magic', 2.0);
            gs.projectiles.push(new Projectile(startX, startY, this.dir * 35, 0, this.id, 0.5, 'illusion_beam'));
        } else if (this.charKey === 'paladin') {
            soundManager.play('melee', 1.0);
            let range = 60 / 1.5; 
            let enemy = this.id === 1 ? gs.players[1] : gs.players[0];
            let dist = (enemy.x + enemy.w/2) - (this.x + this.w/2);
            if (Math.abs(dist) < range && Math.abs((enemy.y + enemy.h/2) - (this.y + this.h/2)) < 60) {
                enemy.takeDamage(baseDmg);
            }
            if (Settings.flashyMode) gs.spawnFlashyParticles(this.x + this.w/2, this.y + this.h/2, "#ffd60a", "burst");
        } else if (this.charKey === 'chronomancer') {
            if (!Settings.noCooldown) this.chronoAmmo--;
            soundManager.play('shoot_magic', 1.3);
            gs.projectiles.push(new Projectile(startX, startY, this.dir * 10 * 1.5, 0, this.id, baseDmg, 'time_needle'));
        }
    }

    createMeleeHitbox(range: number, dmg: number, stunTime: number) {
        const gs = gameStateInstance;
        let enemy = this.id === 1 ? gs.players[1] : gs.players[0];
        let dist = (enemy.x + enemy.w/2) - (this.x + this.w/2);
        if ((this.dir === 1 && dist > 0 && dist < range) || (this.dir === -1 && dist < 0 && Math.abs(dist) < range)) {
            if (Math.abs((enemy.y + enemy.h/2) - (this.y + this.h/2)) < 60) {
                enemy.takeDamage(dmg);
                if (stunTime > 0) enemy.stunned = stunTime;
                return true;
            }
        }
        return false;
    }

    useSkill() {
        const gs = gameStateInstance;
        if (this.charKey !== 'ghost' && this.invisible) this.invisible = false;
        if (this.cdSkill > 0 && this.charKey !== 'demolitionist' && this.charKey !== 'illusionist') {
             soundManager.play('empty');
             return; 
        }
        
        soundManager.play('cast', this.id === 1 ? 1.0 : 0.7);
        if (Settings.flashyMode && this.charKey !== 'illusionist') gs.spawnFlashyParticles(this.x+this.w/2, this.y+this.h/2, this.stats.color, "burst");

        if (this.charKey === 'mage') {
            this.cdSkill = 600; this.resource = 100;
            gs.addPopup(this.x, this.y, "Mana Full", "#5ac8fa");
        }
        else if (this.charKey === 'warrior') {
            if (!Settings.noCooldown && this.resource < 30) { soundManager.play('empty'); return; }
            if (!Settings.noCooldown) this.resource -= 30;
            this.cdSkill = 480; this.actionState = 'dashing'; this.actionTimer = 24; this.vx = this.dir * 8; this.invuln = 10;
            gs.particles.push(new Particle(this.x, this.y - 30, "#ff0000", "rage_face"));
        }
        else if (this.charKey === 'tank') {
            this.cdSkill = 300; this.nextHitStun = true; gs.addPopup(this.x, this.y, "Stun Ready", "#34c759");
        }
        else if (this.charKey === 'marksman') {
            if (!Settings.noCooldown && this.resource < 25) { soundManager.play('empty'); return; }
            if (!Settings.noCooldown) this.resource -= 25;
            this.cdSkill = 300; this.actionState = 'rolling'; this.actionTimer = 10; this.vx = this.dir * 15; this.invuln = 30;
        }
        else if (this.charKey === 'ghost') {
            this.cdSkill = 600; 
            this.invisible = true; 
            this.invisibleTimer = 600; 
            if (this.stunned > 0) {
                this.stunned = 0;
                gs.addPopup(this.x, this.y, "CLEANSED!", "#fff");
            }
            gs.addPopup(this.x, this.y, "Invisible (10s)", "#af52de");
        }
        else if (this.charKey === 'gambler') {
            this.cdSkill = 300; 
            const roll = Math.random();
            this.rouletteAnim = 30; 
            if (roll < 0.333) {
                this.buffSpeed = true; this.buffDuration = 180; 
                gs.addPopup(this.x, this.y - 40, "JACKPOT! Speed Up", "#34c759");
            } else if (roll < 0.666) {
                this.cdUlt = 0; gs.addPopup(this.x, this.y - 40, "LUCKY! Ult Reset", "#007aff");
            } else {
                this.stunned = 60; gs.addPopup(this.x, this.y - 40, "BUST! Stunned", "#ff3b30");
            }
        }
        else if (this.charKey === 'demolitionist') {
            if (this.activeC4 && this.activeC4.active) {
                this.activeC4.life = 0; 
                this.activeC4 = null;
                this.cdSkill = 60; 
                return;
            }
            if (this.cdSkill > 0) return;
            if (!Settings.noCooldown && this.resource < 1) {
                gs.addPopup(this.x, this.y - 20, "No Ammo!", "#ff9500");
                soundManager.play('empty');
                return;
            }
            if (!Settings.noCooldown) this.resource -= 1;
            
            let c4 = new Projectile(this.x + this.w/2 - 10, this.y + this.h - 5, 0, 0, this.id, 1, 'c4_trap');
            gs.projectiles.push(c4);
            this.activeC4 = c4;
            this.c4Timer = 0; 
            this.cdSkill = 30; 
            gs.addPopup(this.x, this.y - 30, "C4 Set", "#ff9500");
            return;
        }
        else if (this.charKey === 'illusionist') {
            if (this.clone.active) {
                gs.spawnFlashyParticles(this.x, this.y, "#ff2d55", "dash"); 
                this.x = this.clone.x;
                this.y = this.clone.y;
                this.dir = this.clone.dir;
                this.vx = 0; this.vy = 0;
                gs.spawnFlashyParticles(this.x, this.y, "#00ffff", "burst"); 
                gs.addPopup(this.x, this.y - 40, "Return!", "#00ffff");
                this.clone.active = false;
                this.cdSkill = 300; 
                return;
            }
            if (this.cdSkill > 0) return;
            
            this.clone.x = this.x;
            this.clone.y = this.y;
            this.clone.dir = this.dir;
            this.clone.active = true;
            
            let dashDist = 100; 
            let targetX = this.x + (this.dir * dashDist);
            if (targetX < 0) targetX = 0;
            if (targetX > CANVAS_W - this.w) targetX = CANVAS_W - this.w;
            
            this.x = targetX;
            this.y -= 5; 
            
            gs.addPopup(this.clone.x, this.clone.y - 40, "Clone!", "#ff2d55");
            this.cdSkill = 30; 
            return;
        }
        else if (this.charKey === 'paladin') {
            if (!Settings.noCooldown && this.resource < 30) {
                gs.addPopup(this.x, this.y - 20, "Need Faith", "#ffd60a");
                soundManager.play('empty');
                return;
            }
            if (!Settings.noCooldown) this.resource -= 30;
            
            this.cdSkill = 600; 
            this.reflecting = 60; 
            gs.addPopup(this.x, this.y - 40, "SHIELD!", "#ffd60a");
        }
        else if (this.charKey === 'chronomancer') {
            if (!Settings.noCooldown && this.resource < 50) {
                gs.addPopup(this.x, this.y - 20, "Need Energy", "#5e5ce6");
                soundManager.play('empty');
                return;
            }
            if (!Settings.noCooldown) this.resource -= 50;
            this.cdSkill = 600;

            if (this.history.length > 0) {
                let oldState = this.history[0];
                gs.spawnFlashyParticles(this.x, this.y, "#5e5ce6", "dash");
                
                this.x = oldState.x;
                this.y = oldState.y;
                if (oldState.hp > this.hp) {
                    let heal = oldState.hp - this.hp;
                    this.hp = oldState.hp;
                    gs.addPopup(this.x, this.y - 40, `Rewind +${heal}HP`, "#00ff00");
                } else {
                    gs.addPopup(this.x, this.y - 40, "Rewind!", "#5e5ce6");
                }
                gs.spawnFlashyParticles(this.x, this.y, "#5e5ce6", "burst");
            } else {
                gs.addPopup(this.x, this.y - 40, "No History", "#ccc");
            }
        }
    }

    useUlt() {
        const gs = gameStateInstance;
        if (this.invisible) {
            this.invisible = false;
            gs.addPopup(this.x, this.y, "Revealed!", "#fff");
        }
        if (this.cdUlt > 0) { soundManager.play('empty'); return; }
        
        soundManager.play('ult', 1.0);
        if (Settings.flashyMode) gs.spawnFlashyParticles(this.x+this.w/2, this.y, this.stats.color, "nova");

        if (this.charKey === 'mage') {
            if (!Settings.noCooldown && this.resource < 60) { soundManager.play('empty'); return; }
            if (!Settings.noCooldown) this.resource -= 60;
            this.charging = true; 
            this.chargeTimer = 60; 
        }
        else if (this.charKey === 'warrior') {
            if (!Settings.noCooldown && this.resource < 80) { soundManager.play('empty'); return; }
            if (!Settings.noCooldown) this.resource -= 80;
            this.raging = 300; gs.addPopup(this.x, this.y, "RAGE!", "#ff3b30");
        }
        else if (this.charKey === 'tank') {
            this.cdUlt = 1080; this.tankUlt = 180; gs.addPopup(this.x, this.y, "Guard Up", "#34c759");
        }
        else if (this.charKey === 'marksman') {
            if (!Settings.noCooldown && this.resource < 60) { soundManager.play('empty'); return; }
            if (!Settings.noCooldown) this.resource -= 60;
            for(let i=0; i<20; i++) {
                 let angle = (Math.random() - 0.5) * 1; let speed = Math.random() * 5 + 2;
                 let p = new Particle(this.x+(this.dir===1?this.w:0), this.y+this.h/2, "#ff9500", 'spark');
                 p.vx = (this.dir * speed) + Math.cos(angle)*2; p.vy = Math.sin(angle) * 2;
                 gs.particles.push(p);
            }
            for(let i=-2; i<=2; i++) {
                let vy = i * 2; gs.projectiles.push(new Projectile(this.x + (this.dir===1?this.w:0), this.y + this.h/2, this.dir * 12, vy, this.id, 1, 'bullet'));
            }
        }
        else if (this.charKey === 'ghost') {
            this.cdUlt = 600; 
            gs.projectiles.push(new Projectile(this.x, this.y + this.h/2, this.dir * 30, 0, this.id, 0, 'hook'));
        }
        else if (this.charKey === 'gambler') {
            this.cdUlt = 900; 
            for(let i=0; i<3; i++) {
                let vy = -10 - (i * 2); 
                let vx = this.dir * (6 + i * 2);
                gs.projectiles.push(new Projectile(this.x, this.y, vx, vy, this.id, 1, 'dice_boulder'));
            }
        }
        else if (this.charKey === 'demolitionist') {
            if (!Settings.noCooldown && this.resource < 2) {
                gs.addPopup(this.x, this.y - 20, "Need 2 Ammo!", "#ff9500");
                soundManager.play('empty');
                return;
            }
            if (!Settings.noCooldown) this.resource -= 2;
            this.cdUlt = 900;

            for(let i=1; i<=3; i++) {
                let distance = (i * 2) * this.w; 
                let targetX = this.x + (this.dir * distance);
                targetX = Math.max(50, Math.min(CANVAS_W - 50, targetX));
                
                let bomb = new Projectile(targetX, -50, 0, 0, this.id, 2, 'carpet_bomb');
                bomb.life = 120; 
                bomb.tickTimer = i * 15; 
                gs.projectiles.push(bomb);
            }
            gs.addPopup(this.x, this.y - 40, "INCOMING!", "#ff3b30");
        }
        else if (this.charKey === 'illusionist') {
            this.cdUlt = 1200; 
            gs.projectiles.push(new Projectile(this.x, this.y + this.h/2, this.dir * 20, 0, this.id, 0, 'swap_bullet'));
            gs.addPopup(this.x, this.y - 40, "BANISH!", "#af52de");
        }
        else if (this.charKey === 'paladin') {
            if (!Settings.noCooldown && this.resource < 70) {
                gs.addPopup(this.x, this.y - 20, "Need 70 Faith!", "#ffd60a");
                soundManager.play('empty');
                return;
            }
            if (!Settings.noCooldown) this.resource -= 70;
            
            this.cdUlt = 1200; 
            let targetX = this.x + (this.dir * 150);
            if(targetX < 50) targetX = 50; 
            if(targetX > CANVAS_W-50) targetX = CANVAS_W-50;
            
            gs.projectiles.push(new Projectile(targetX, 0, 0, 0, this.id, 1, 'light_pillar'));
            gs.addPopup(this.x, this.y - 40, "JUDGMENT!", "#ffd60a");
        }
        else if (this.charKey === 'chronomancer') {
            if (!Settings.noCooldown && this.resource < 100) {
                gs.addPopup(this.x, this.y - 20, "Need 100 Energy!", "#5e5ce6");
                soundManager.play('empty');
                return;
            }
            if (!Settings.noCooldown) this.resource -= 100;
            this.cdUlt = 1200; 

            gs.projectiles.push(new Projectile(this.x + (this.dir*40), this.y + this.h/2 - 40, this.dir * 2, 0, this.id, 0, 'stasis_field'));
            gs.addPopup(this.x, this.y - 40, "SLOW DOWN!", "#5e5ce6");
        }
    }

    fireLaser() {
        const gs = gameStateInstance;
        let laserY = this.y + this.h/2;
        gs.projectiles.push(new Projectile(0, laserY, 0, 0, this.id, 1, 'mage_ult'));
        if (Settings.flashyMode) gs.spawnFlashyParticles(this.x, laserY, "#5ac8fa", "beam_trail");
    }

    useSwap() {
        const gs = gameStateInstance;
        if (this.cdSwap > 0) { soundManager.play('empty'); return; }
        this.cdSwap = SWAP_COOLDOWN;
        let other = this.id === 1 ? gs.players[1] : gs.players[0];
        let tx = this.x; let ty = this.y;
        this.x = other.x; this.y = other.y;
        other.x = tx; other.y = ty;
        gs.addPopup(this.x, this.y, "SWAP!", "#af52de"); gs.addPopup(other.x, other.y, "SWAP!", "#af52de");
        if (Settings.flashyMode) {
            gs.spawnFlashyParticles(this.x, this.y, "#af52de", "burst");
            gs.spawnFlashyParticles(other.x, other.y, "#af52de", "burst");
        }
        soundManager.play('cast', 1.5);
    }

    draw(ctx: CanvasRenderingContext2D) {
         if (this.lives <= 0) return;
         const gs = gameStateInstance;
         
         if (this.invisible) {
             let blinkCycle = this.invisibleTimer % 90;
             if (blinkCycle > 10) return; 
             ctx.globalAlpha = 0.4; 
         }
         
         if (this.clone.active) {
             ctx.save();
             ctx.globalAlpha = 0.5;
             ctx.fillStyle = this.stats.color; 
             ctx.fillRect(this.clone.x, this.clone.y, this.w, this.h);
             ctx.fillStyle = "#fff";
             if (this.clone.dir === 1) ctx.fillRect(this.clone.x + 20, this.clone.y + 10, 5, 5);
             else ctx.fillRect(this.clone.x + 5, this.clone.y + 10, 5, 5);
             ctx.restore();
         }
         
         if (this.raging > 0) {
             ctx.save();
             ctx.strokeStyle = `rgba(255, 59, 48, ${(this.raging % 20) / 20})`;
             ctx.lineWidth = 3;
             ctx.strokeRect(this.x-5, this.y-5, this.w+10, this.h+10);
             ctx.restore();
         }

         if (this.tankUlt > 0) {
             ctx.save();
             ctx.strokeStyle = "#34c759";
             ctx.lineWidth = 2;
             ctx.beginPath();
             let cx = this.x + this.w/2;
             let cy = this.y + this.h/2;
             for (let r=0; r<50; r+=15) {
                 ctx.moveTo(cx + r, cy);
                 for (let i=1; i<=6; i++) {
                     ctx.lineTo(cx + r * Math.cos(i*Math.PI/3), cy + r * Math.sin(i*Math.PI/3));
                 }
             }
             ctx.stroke();
             ctx.restore();
         }

         if (this.doubleDamageTimer > 0) {
             ctx.save();
             ctx.strokeStyle = "#af52de";
             ctx.lineWidth = 2;
             ctx.setLineDash([5, 5]);
             ctx.strokeRect(this.x-2, this.y-2, this.w+4, this.h+4);
             ctx.restore();
         }
         
         if (this.reflecting > 0) {
             ctx.save();
             let centerX = this.x + this.w/2;
             let centerY = this.y + this.h/2;
             let shieldAngle = this.dir === 1 ? 0 : Math.PI;
             
             ctx.beginPath();
             ctx.arc(centerX, centerY, 40, shieldAngle - Math.PI/3, shieldAngle + Math.PI/3);
             ctx.lineWidth = 4;
             ctx.strokeStyle = "#ffd60a";
             ctx.stroke();
             ctx.globalAlpha = 0.3;
             ctx.fillStyle = "#ffd60a";
             ctx.fill();
             ctx.restore();
         }
         
         if (this.rouletteAnim > 0) {
             this.rouletteAnim--;
             ctx.save();
             ctx.fillStyle = `hsl(${this.rouletteAnim * 20}, 100%, 50%)`;
             ctx.font = "bold 20px Arial";
             ctx.fillText("?", this.x + this.w/2, this.y - 20);
             ctx.restore();
         }

         if (this.atkAnimTimer > 0) {
            ctx.save();
            let cx = this.x + this.w/2; let cy = this.y + this.h/2; let range = 40;
            if (this.charKey === 'warrior') {
                ctx.beginPath();
                let startAngle = this.dir === 1 ? -0.5 : Math.PI - 0.5;
                let endAngle = this.dir === 1 ? 0.5 : Math.PI + 0.5;
                ctx.arc(cx, cy, range + 10, startAngle, endAngle, false);
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.atkAnimTimer/15})`;
                ctx.lineWidth = 8; ctx.stroke();
                ctx.strokeStyle = `rgba(255, 59, 48, ${this.atkAnimTimer/15})`;
                ctx.lineWidth = 4; ctx.stroke();
            } else if (this.charKey === 'tank') {
                ctx.fillStyle = `rgba(52, 199, 89, ${this.atkAnimTimer/15})`;
                let bx = this.dir === 1 ? this.x + this.w : this.x - 40;
                ctx.fillRect(bx, this.y, 40, this.h);
            } else if (this.charKey === 'ghost') {
                ctx.strokeStyle = "#af52de";
                ctx.lineWidth = 3;
                let offX = this.dir * 60;
                ctx.beginPath(); 
                ctx.moveTo(cx, cy); 
                ctx.lineTo(cx+offX, cy); 
                for(let k=0; k<3; k++) {
                    ctx.moveTo(cx + (offX*(k/3)), cy-5);
                    ctx.lineTo(cx + (offX*((k+1)/3)), cy+5);
                }
                ctx.stroke();
            } else if (this.charKey === 'paladin') {
                // Paladin Visual Overhaul: Massive Hammer Swing (360 degrees)
                ctx.save();
                ctx.translate(cx, cy);
                let swingProgress = 1 - (this.atkAnimTimer / 15); 
                
                // Spin 360.
                // Right (dir=1): Start Back (PI) -> Top -> Front (0/2PI) -> Down -> Back (3PI)
                // Left (dir=-1): Start Back (0) -> Top (-PI/2) -> Front (-PI) -> Down -> Back (-2PI)
                let angle = 0;
                if (this.dir === 1) {
                    angle = Math.PI + (swingProgress * Math.PI * 2);
                } else {
                    angle = 0 - (swingProgress * Math.PI * 2);
                }
                
                ctx.rotate(angle);
                // Hammer handle
                ctx.fillStyle = "#8b4513";
                ctx.fillRect(0, -4, 60, 8);
                // Hammer head
                ctx.fillStyle = "#ffd60a";
                ctx.shadowColor = "#ffd60a";
                ctx.shadowBlur = 10;
                ctx.fillRect(50, -15, 20, 30);
                ctx.restore();
            }
            ctx.restore();
         }

         ctx.fillStyle = this.stats.color;
         if (this.invuln > 0 && Math.floor(Date.now()/50)%2===0) ctx.fillStyle = "#fff"; 
         ctx.fillRect(this.x, this.y, this.w, this.h);
         
         ctx.fillStyle = "rgba(255,255,255,0.6)";
         ctx.beginPath();
         if (this.dir === 1) { 
             ctx.moveTo(this.x + this.w - 4, this.y + 10);
             ctx.lineTo(this.x + this.w + 4, this.y + 15);
             ctx.lineTo(this.x + this.w - 4, this.y + 20);
         } else { 
             ctx.moveTo(this.x + 4, this.y + 10);
             ctx.lineTo(this.x - 4, this.y + 15);
             ctx.lineTo(this.x + 4, this.y + 20);
         }
         ctx.fill();
         
         ctx.font = "30px Apple Color Emoji, Segoe UI Emoji";
         ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
         ctx.fillText(this.stats.icon, this.x + this.w/2, this.y + this.h/2 + 2);

         if (this.charging) {
             ctx.fillStyle = "#5ac8fa";
             ctx.fillRect(this.x, this.y - 10, this.w * (this.chargeTimer/60), 5);
         }
         if (this.mageChargingAtk) {
             ctx.fillStyle = "#5ac8fa";
             ctx.fillRect(this.x, this.y - 15, this.w * Math.min(1, this.mageChargeAtkTimer/120), 3);
         }
         ctx.globalAlpha = 1.0;
    }
}