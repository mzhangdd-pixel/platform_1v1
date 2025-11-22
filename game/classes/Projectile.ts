import { CANVAS_W, CANVAS_H, GRAVITY } from "../../constants";
import { Settings } from "../../utils/settings";
import { soundManager } from "../../utils/soundManager";
import { gameStateInstance } from "../gameState";
import { Particle } from "./Particle";

export class Projectile {
    x: number; y: number; vx: number; vy: number;
    ownerId: number; dmg: number; type: string;
    active: boolean = true;
    w: number; h: number;
    life: number = 0;
    tickTimer: number = 0;
    hasRooted: boolean = false;
    age: number = 0;
    hasExploded: boolean = false;
    
    // Gambler suit index
    subtype: number = 0; 

    constructor(x: number, y: number, vx: number, vy: number, ownerId: number, dmg: number, type: string, subtype: number = 0) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.ownerId = ownerId; this.dmg = dmg; this.type = type;
        this.subtype = subtype;
        
        this.w = (type === 'fireball') ? 15 : 8; this.h = (type === 'fireball') ? 15 : 8;
        if (type === 'hook') { this.w = 20; this.h = 10; }
        if (type === 'card') { this.w = 14; this.h = 20; }
        if (type === 'dice_boulder') { this.w = 30; this.h = 30; }
        if (type === 'grenade') { this.w = 12; this.h = 12; }
        if (type === 'c4_trap') { this.w = 20; this.h = 6; }
        if (type === 'carpet_bomb') { this.w = 60; this.h = 60; this.x -= 30; }
        if (type === 'illusion_beam') { this.w = 40; this.h = 6; }
        if (type === 'swap_bullet') { this.w = 20; this.h = 20; }
        if (type === 'light_pillar') { this.w = 60; this.h = CANVAS_H; this.y = 0; }
        if (type === 'time_needle') { this.w = 30; this.h = 6; }
        
        // Chronomancer Ult: Radius * 1.5 = 120 * 1.5 = 180
        if (type === 'stasis_field') { this.w = 180; this.h = 180; this.life = 300; } 

        if (type === 'laser_beam' || type === 'mage_ult') { this.w = CANVAS_W; this.h = 40; this.x = 0; this.life = 180; this.tickTimer = 0; }
        
        if (type === 'c4_trap') this.life = 180;
        if (type === 'carpet_bomb') this.hasExploded = false;
        if (type === 'light_pillar') { this.life = 90; this.tickTimer = 0; }
    }

    update() {
        if (!this.active) return;
        this.age++;

        const gs = gameStateInstance;

        // --- CHRONOMANCER ---
        if (this.type === 'time_needle') {
            // Speed * 1.5 applied in Player.ts, sine wave logic retained
            this.x += (this.vx > 0 ? 1 : -1) * (8 + Math.sin(this.age * 0.2) * 6);
            this.y += this.vy;
            if (this.x < -50 || this.x > CANVAS_W + 50) this.active = false;
        }
        else if (this.type === 'stasis_field') {
            this.life--;
            if (this.life <= 0) this.active = false;
            this.x += this.vx; 
            if(this.x < 0 || this.x > CANVAS_W - this.w) this.vx *= -1;
            
            let cx = this.x + this.w/2; 
            let cy = this.y + this.h/2;
            let r = this.w/2;
            
            gs.projectiles.forEach(p => {
                if (p === this || !p.active || p.type === 'light_pillar' || p.type === 'laser_beam' || p.type === 'mage_ult') return;
                let pcx = p.x + p.w/2;
                let pcy = p.y + p.h/2;
                let dist = Math.sqrt(Math.pow(pcx - cx, 2) + Math.pow(pcy - cy, 2));
                
                if (dist < r) {
                    if (p.type !== 'time_needle') {
                        // Chronomancer Ult: Slow Down (not freeze)
                        // Apply drag factor
                        p.x -= p.vx * 0.5;
                        p.y -= p.vy * 0.5;
                    }
                }
            });
            return;
        }
        // --- PALADIN LOGIC (LIGHT PILLAR) ---
        else if (this.type === 'light_pillar') {
            this.life--;
            if (this.life <= 0) this.active = false;
            
            this.tickTimer++;
            if (this.tickTimer % 30 === 0) {
                let enemy = this.ownerId === 1 ? gs.players[1] : gs.players[0];
                if (enemy && enemy.x + enemy.w > this.x && enemy.x < this.x + this.w) {
                    enemy.takeDamage(this.dmg);
                    enemy.stunned = 60;
                    gs.addPopup(enemy.x, enemy.y, "PURGED!", "#ffd60a");
                }
            }
            if (Settings.flashyMode) {
                for(let i=0; i<3; i++) {
                    let py = Math.random() * CANVAS_H;
                    gs.particles.push(new Particle(this.x + Math.random()*this.w, py, "#fff", "aura"));
                }
            }
            return;
        }
        // --- DEMOLITIONIST PROJECTILES ---
        else if (this.type === 'grenade') {
            this.vy += GRAVITY; // Use actual physics gravity to match aim calculation
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 0 || this.x > CANVAS_W) this.active = false;

            let hitGround = false;
            if (this.y + this.h >= 650) { hitGround = true; }
            gs.platforms.forEach(p => {
                if (this.vy > 0 && this.y + this.h >= p.y && this.y < p.y + 10 && this.x > p.x && this.x < p.x + p.w) hitGround = true;
            });
            
            let enemy = this.ownerId === 1 ? gs.players[1] : gs.players[0];
            
            // Paladin Reflector Logic
            if (enemy && enemy.charKey === 'paladin' && enemy.reflecting > 0) {
                let close = (this.x < enemy.x + enemy.w + 20 && this.x + this.w > enemy.x - 20 && this.y < enemy.y + enemy.h && this.y + this.h > enemy.y);
                if (close) {
                    // Paladin Skill: Perfect Reflection
                    // Calculate vector back to owner
                    let owner = gs.players[this.ownerId - 1];
                    if (owner) {
                        let dx = owner.x - this.x;
                        let dy = owner.y - this.y;
                        let mag = Math.sqrt(dx*dx + dy*dy);
                        let speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy) || 10;
                        this.vx = (dx / mag) * speed;
                        this.vy = (dy / mag) * speed;
                    } else {
                        this.vx *= -1; // Fallback
                    }
                    
                    this.ownerId = enemy.id;
                    this.x += this.vx * 3;
                    gs.addPopup(this.x, this.y, "REFLECT!", "#ffd60a");
                    soundManager.play('hit', 1.5);
                    return; 
                }
            }

            let hitEnemy = enemy ? (this.x < enemy.x + enemy.w && this.x + this.w > enemy.x && this.y < enemy.y + enemy.h && this.y + this.h > enemy.y) : false;

            if (hitGround || hitEnemy) {
                this.active = false;
                gs.spawnFlashyParticles(this.x, this.y, "#ff9500", "nova");
                gs.spawnFlashyParticles(this.x, this.y, "#000", "splash"); 
                soundManager.play('hit', 0.5); 
                if (hitEnemy && enemy) {
                    enemy.takeDamage(this.dmg);
                } else if (enemy) {
                    let dist = Math.sqrt(Math.pow((enemy.x+enemy.w/2) - this.x, 2) + Math.pow((enemy.y+enemy.h/2) - this.y, 2));
                    if (dist < 60) enemy.takeDamage(this.dmg);
                }
            }
            return;
        }
        else if (this.type === 'c4_trap') {
            this.life--;
            if (this.life <= 0) {
                this.active = false;
                gs.spawnFlashyParticles(this.x, this.y, "#ff9500", "nova");
                soundManager.play('hit', 0.6);
                let enemy = this.ownerId === 1 ? gs.players[1] : gs.players[0];
                if (enemy) {
                    let dist = Math.sqrt(Math.pow((enemy.x+enemy.w/2) - this.x, 2) + Math.pow((enemy.y+enemy.h/2) - this.y, 2));
                    if (dist < 80) {
                        enemy.takeDamage(this.dmg);
                        gs.addPopup(enemy.x, enemy.y, "BOOM!", "#ff3b30");
                    }
                }
            }
            return;
        }
        else if (this.type === 'carpet_bomb') {
            // Demolitionist Ult Logic: Bombs fall from sky
            if (this.tickTimer > 0) {
                this.tickTimer--; 
                return;
            }
            // Falling logic
            this.vy += 0.5;
            this.y += this.vy;
            
            if (this.y > 600) { // Hit ground
                 this.hasExploded = true;
                 gs.spawnFlashyParticles(this.x + this.w/2, 650, "#ff9500", "nova");
                 gs.spawnFlashyParticles(this.x + this.w/2, 650, "#ff0000", "death");
                 soundManager.play('ult', 0.5);
                 
                 let enemy = this.ownerId === 1 ? gs.players[1] : gs.players[0];
                 if (enemy && enemy.x + enemy.w > this.x && enemy.x < this.x + this.w && enemy.y + enemy.h > 500) {
                     enemy.takeDamage(this.dmg);
                     enemy.stunned = 30;
                 }
                 this.active = false;
            }
            return;
        }
        else if (this.type === 'dice_boulder') {
            this.vy += 0.5; 
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.y + this.h > 650) {
                this.y = 650 - this.h;
                // Gambler Ult: Elastic Bounce
                this.vy = -this.vy * 0.8; // Increase bounciness
                if(Math.abs(this.vy) < 1) this.active = false; 
            }
             gs.platforms.forEach(p => {
                if (this.vy > 0 && this.y + this.h >= p.y && this.y < p.y + 10 && this.x > p.x && this.x < p.x + p.w) {
                    this.y = p.y - this.h;
                    this.vy = -this.vy * 0.8; 
                }
            });

            if (this.x < 0 || this.x > CANVAS_W) this.vx *= -1; 
        } 
        else if (this.type === 'laser_beam' || this.type === 'mage_ult') {
            this.life--; if (this.life <= 0) this.active = false;
            if (Math.random() < 0.5) {
                let py = this.y + (Math.random()-0.5)*20;
                gs.particles.push(new Particle(Math.random()*CANVAS_W, py, "#5ac8fa", 'rune'));
            }
            this.tickTimer++;
            if (this.tickTimer % 30 === 0) {
                let enemy = this.ownerId === 1 ? gs.players[1] : gs.players[0];
                if (enemy && Math.abs((enemy.y + enemy.h/2) - this.y) < this.h) {
                     if (this.type === 'mage_ult') {
                         if (!this.hasRooted) {
                             enemy.takeDamage(1); 
                             enemy.stunned = 120; 
                             gs.addPopup(enemy.x, enemy.y, "ROOTED!", "#5ac8fa");
                             this.hasRooted = true;
                         }
                     } else {
                        enemy.takeDamage(1);
                     }
                }
            }
            return;
        } else {
            this.x += this.vx; this.y += this.vy;
        }

        if (this.x < -50 || this.x > CANVAS_W + 50) this.active = false;
        
        // Visual Overhaul: Mages leave rune trails
        if (this.type === 'fireball' && Math.random() < 0.4) {
             gs.particles.push(new Particle(this.x, this.y, "#5ac8fa", "rune"));
        }
        // Marksman smoke trail
        if (this.type === 'bullet' && Math.random() < 0.3) {
             gs.particles.push(new Particle(this.x, this.y, "#888", "smoke"));
        }

        let enemy = this.ownerId === 1 ? gs.players[1] : gs.players[0];
        if (!enemy) return;
        
        // Paladin Reflection Check (Generic)
        if (enemy.charKey === 'paladin' && enemy.reflecting > 0) {
            if (this.x < enemy.x + enemy.w + 20 && this.x + this.w > enemy.x - 20 && this.y < enemy.y + enemy.h && this.y + this.h > enemy.y) {
                if (['fireball', 'bullet', 'card', 'dice_boulder', 'illusion_beam', 'swap_bullet', 'time_needle'].includes(this.type)) {
                    // Paladin Skill: Perfect Reflection
                    let owner = gs.players[this.ownerId - 1];
                    if (owner) {
                        let dx = owner.x - this.x;
                        let dy = owner.y - this.y;
                        let mag = Math.sqrt(dx*dx + dy*dy);
                        let speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy) || 10;
                        this.vx = (dx / mag) * speed;
                        this.vy = (dy / mag) * speed;
                    } else {
                        this.vx *= -1;
                    }
                    
                    this.ownerId = enemy.id; 
                    this.x += this.vx * 2; 
                    gs.addPopup(this.x, this.y, "REFLECT!", "#ffd60a");
                    gs.spawnFlashyParticles(this.x, this.y, "#ffd60a", "spark");
                    soundManager.play('hit', 2.0); 
                    return; 
                }
            }
        }

        if (this.x < enemy.x + enemy.w && this.x + this.w > enemy.x && this.y < enemy.y + enemy.h && this.y + this.h > enemy.y) {
            if (this.type === 'hook') {
                let owner = gs.players[this.ownerId-1];
                if (owner) {
                    owner.doubleDamageTimer = 120; 
                    gs.addPopup(owner.x, owner.y - 30, "Buffed!", "#af52de");
                    enemy.x = owner.x + (owner.dir * 50);
                    enemy.y = owner.y; 
                    enemy.vx = 0; 
                    enemy.stunned = 90; 
                    gs.addPopup(enemy.x, enemy.y, "HOOKED!", "#af52de");
                }
                this.active = false;
            } 
            else if (this.type === 'swap_bullet') {
                let owner = gs.players[this.ownerId - 1];
                if (owner) {
                    let targetX = owner.x + (owner.dir * 100);
                    if (targetX < 0) targetX = 50; if(targetX > CANVAS_W) targetX = CANVAS_W - 50;
                    enemy.x = targetX;
                    enemy.y = 600; 
                    enemy.vx = 0; enemy.vy = 0;
                    enemy.stunned = 60;
                    gs.spawnFlashyParticles(enemy.x, enemy.y, "#af52de", "nova");
                    gs.addPopup(enemy.x, enemy.y - 40, "TELEPORTED!", "#af52de");
                }
                this.active = false;
            }
            else if (this.type === 'illusion_beam') {
                enemy.takeDamage(this.dmg);
                for(let i=0; i<5; i++) gs.particles.push(new Particle(this.x, this.y, "#00ffff", "spark"));
                this.active = false;
            }
            else {
                enemy.takeDamage(this.dmg);
                this.active = false;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        if (this.tickTimer > 0 && this.type === 'carpet_bomb') return; 

        const gs = gameStateInstance;

        // --- CHRONOMANCER ULT UI (Clock) ---
        if (this.type === 'stasis_field') {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = "#5e5ce6";
            ctx.beginPath(); ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/2, 0, Math.PI*2); ctx.fill();
            
            // Draw Clock UI
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(0, 0, this.w/2 - 5, 0, Math.PI*2); ctx.stroke();
            
            // Hands
            let t = gs.globalTime;
            // Hour
            ctx.beginPath(); ctx.moveTo(0,0); 
            let hx = Math.cos(t * 0.01) * (this.w/4); let hy = Math.sin(t * 0.01) * (this.w/4);
            ctx.lineTo(hx, hy); ctx.stroke();
            // Min
            ctx.beginPath(); ctx.moveTo(0,0); 
            let mx = Math.cos(t * 0.05) * (this.w/3); let my = Math.sin(t * 0.05) * (this.w/3);
            ctx.lineTo(mx, my); ctx.stroke();
            
            ctx.restore();
            return;
        }
        
        if (this.type === 'time_needle') {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            let rot = (this.vx > 0 ? 0 : Math.PI) + (Math.sin(this.age * 0.2) * 0.2); 
            ctx.rotate(rot);
            ctx.fillStyle = "#5e5ce6";
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(-15, -5); ctx.lineTo(-15, 5); ctx.fill();
            ctx.strokeStyle = "rgba(94, 92, 230, 0.5)";
            ctx.beginPath();
            ctx.moveTo(-5, 0); ctx.lineTo(-25, 0); ctx.stroke();
            ctx.restore();
            return;
        }

        if (this.type === 'light_pillar') {
            ctx.save();
            let alpha = (this.life < 15) ? this.life/15 : 1; 
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = "#ffd60a";
            ctx.fillRect(this.x - 10, 0, this.w + 20, CANVAS_H);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = "#fff";
            ctx.fillRect(this.x, 0, this.w, CANVAS_H);
            ctx.strokeStyle = "#ffd60a";
            ctx.lineWidth = 2;
            let offset = (gs.globalTime * 10) % 50;
            for(let i=0; i<CANVAS_H; i+=50) {
                ctx.beginPath();
                ctx.moveTo(this.x + Math.random()*this.w, i - offset);
                ctx.lineTo(this.x + Math.random()*this.w, i - offset - 20);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        if (this.type === 'laser_beam' || this.type === 'mage_ult') {
            ctx.save();
            if (Settings.flashyMode) {
                ctx.shadowBlur = 20; ctx.shadowColor = "#5ac8fa";
                ctx.fillStyle = `rgba(255, 255, 255, ${this.life/180})`;
                ctx.fillRect(0, this.y - this.h/2 + 10, CANVAS_W, this.h - 20);
            }
            ctx.fillStyle = `rgba(90, 200, 250, ${this.life/180 * 0.5})`;
            ctx.fillRect(0, this.y - this.h/2, CANVAS_W, this.h);
            ctx.restore();
            return;
        }
        
        // Visual Overhaul: Ghost Hook Chain
        if (this.type === 'hook') {
            let owner = gs.players[this.ownerId - 1];
            if (owner) {
                ctx.strokeStyle = "#af52de"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(owner.x + owner.w/2, owner.y + owner.h/2); ctx.lineTo(this.x, this.y); ctx.stroke();
                // Links
                let dx = this.x - (owner.x+owner.w/2);
                let dy = this.y - (owner.y+owner.h/2);
                let dist = Math.sqrt(dx*dx+dy*dy);
                let links = Math.floor(dist / 20);
                ctx.fillStyle = "#555";
                for(let i=0; i<links; i++) {
                    let t = i/links;
                    ctx.fillRect((owner.x+owner.w/2) + dx*t - 3, (owner.y+owner.h/2) + dy*t - 3, 6, 6);
                }
            }
            ctx.fillStyle = "#af52de";
            // Draw Hook Head
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - 10, this.y - 10);
            ctx.lineTo(this.x - 10, this.y + 10);
            ctx.fill();
        } 
        else if (this.type === 'card') {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(gs.globalTime * 0.2);
            ctx.fillStyle = "#fff";
            ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            ctx.strokeStyle = "#000";
            ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
            // Gambler Attack: Random Suits Fixed
            const suits = ["♠", "♥", "♣", "♦"];
            let suit = suits[this.subtype % 4];
            ctx.fillStyle = (suit === "♥" || suit === "♦") ? "red" : "black";
            ctx.font = "12px Arial";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(suit, 0, 0);
            ctx.restore();
            return;
        } else if (this.type === 'dice_boulder') {
             ctx.save();
             ctx.translate(this.x + this.w/2, this.y + this.h/2);
             ctx.rotate(gs.globalTime * 0.1);
             ctx.fillStyle = "#fff";
             ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
             ctx.lineWidth = 2;
             ctx.strokeStyle = "#d4af37";
             ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
             ctx.fillStyle = "#000";
             ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
             ctx.restore();
             return;
        }
        else if (this.type === 'grenade') {
            // Smart Grenade Visual
            ctx.fillStyle = "#355e3b"; 
            ctx.beginPath(); ctx.arc(this.x, this.y, this.w/2, 0, Math.PI*2); ctx.fill();
            if (Math.floor(gs.globalTime / 5) % 2 === 0) {
                ctx.fillStyle = "#ff0000";
                ctx.beginPath(); ctx.arc(this.x + 2, this.y - 2, 2, 0, Math.PI*2); ctx.fill();
            }
            return;
        }
        else if (this.type === 'c4_trap') {
             ctx.fillStyle = "#444";
             ctx.fillRect(this.x, this.y, this.w, this.h);
             ctx.fillStyle = (this.life % 20 < 10) ? "#ff0000" : "#330000";
             ctx.fillRect(this.x + 5, this.y + 1, 4, 4);
             ctx.fillStyle = "#fff";
             ctx.font = "8px Arial";
             ctx.fillText(Math.ceil(this.life/60).toString(), this.x + 15, this.y + 6);
             return;
        }
        else if (this.type === 'carpet_bomb') {
             // Demolitionist Ult Visual: Actual Bombs
             // Warning Shadow on ground
             let groundY = 650;
             // FIX: Ensure alpha is not negative to avoid IndexSizeError in ellipse
             let alpha = Math.max(0, this.y / groundY); 
             
             if (alpha > 0.01) {
                 ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
                 ctx.beginPath(); 
                 ctx.ellipse(this.x + this.w/2, groundY, this.w/2 * alpha, 10 * alpha, 0, 0, Math.PI*2); 
                 ctx.fill();
             }
             
             // Bomb Sprite
             ctx.translate(this.x + this.w/2, this.y + this.h/2);
             ctx.rotate(Math.PI); // Point down
             ctx.fillStyle = "#000";
             // Simple Bomb shape
             ctx.beginPath();
             ctx.ellipse(0, 0, 15, 25, 0, 0, Math.PI*2);
             ctx.fill();
             // Fins
             ctx.fillStyle = "#333";
             ctx.fillRect(-15, -25, 30, 5);
             
             ctx.setTransform(1,0,0,1,0,0); // Reset transform
             return;
        }
        else if (this.type === 'illusion_beam') {
            // Illusionist Attack: Random Color
            // We don't store per-projectile color in this class easily without adding fields, 
            // but we can use ID or x/y hash to consistent color.
            const colors = ["#ff2d55", "#00ffff", "#ffff00", "#00ff00"];
            let colorIdx = Math.floor((this.x + this.y) % 4);
            let color = colors[colorIdx];
            
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            if (Settings.flashyMode) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.shadowBlur = 0;
            }
            return;
        }
        else if (this.type === 'swap_bullet') {
            ctx.save();
            let scale = 1 + Math.sin(gs.globalTime * 0.2) * 0.1;
            ctx.translate(this.x, this.y);
            ctx.scale(scale, scale);
            ctx.fillStyle = "#af52de";
            ctx.beginPath(); ctx.arc(0, 0, this.w/2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(0, 0, this.w/4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            return;
        }
        
        // Visual Overhaul: Marksman Bullet
        if (this.type === 'bullet') {
            ctx.fillStyle = "#ffd700"; // Gold
            ctx.beginPath();
            ctx.ellipse(this.x + this.w/2, this.y + this.h/2, this.w/2, this.h/4, 0, 0, Math.PI*2);
            ctx.fill();
            return;
        }

        // Visual Overhaul: Mage Fireball (Arcane)
        if (this.type === 'fireball') {
             ctx.fillStyle = "#5ac8fa";
             ctx.beginPath(); ctx.arc(this.x, this.y, this.w/2, 0, Math.PI*2); ctx.fill();
             // Inner glow
             ctx.fillStyle = "#fff";
             ctx.beginPath(); ctx.arc(this.x, this.y, this.w/4, 0, Math.PI*2); ctx.fill();
             return;
        }

        // Fallback
        ctx.fillStyle = this.ownerId === 1 ? '#ff3b30' : '#007aff';
        ctx.save();
        if(Settings.flashyMode) { ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle as string; }
        ctx.beginPath(); ctx.arc(this.x, this.y, this.w/2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}