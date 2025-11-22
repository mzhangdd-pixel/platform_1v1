import { Settings } from "../../utils/settings";

export class Particle {
    x: number;
    y: number;
    color: string;
    type: string;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    rotation: number = 0;
    rotSpeed: number = 0;

    constructor(x: number, y: number, color: string, type = 'normal') {
        this.x = x; this.y = y; this.type = type; this.color = color;
        this.vx = (Math.random() - 0.5) * 5; this.vy = (Math.random() - 0.5) * 5;
        this.life = 30; this.size = 4;
        
        if (type === 'splash') { this.vx *= 2; this.vy *= 2; this.life = 20; }
        else if (type === 'spark') { this.vx *= 0.5; this.vy *= 0.5; this.life = 15; this.size = 2; }
        else if (type === 'aura') { this.vx = 0; this.vy = -2; this.life = 20; this.size = 3; }
        else if (type === 'dash') { this.vx = -2; this.vy = 0; this.life = 10; this.size = 2; }
        else if (type === 'nova') { this.vx *= 4; this.vy *= 4; this.life = 50; this.size = 6; }
        else if (type === 'beam_trail') { this.vx = (Math.random()-0.5)*2; this.vy = (Math.random()-0.5)*2; this.life = 40; }
        
        // Visual Overhaul Types
        else if (type === 'rune') {
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = (Math.random() - 1) * 2; // Float up
            this.life = 45;
            this.size = 10;
            this.rotSpeed = (Math.random() - 0.5) * 0.1;
        }
        else if (type === 'smoke') {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = (Math.random() - 0.5) * 2 - 1;
            this.life = 30;
            this.size = Math.random() * 5 + 5;
        }
        else if (type === 'rage_face') {
            this.vx = 0; this.vy = -2; this.life = 40; this.size = 20;
        }
        else if (type === 'hex') {
            this.vx = 0; this.vy = 0; this.life = 20; this.size = 15;
        }

        this.maxLife = this.life;
    }

    update() {
        this.x += this.vx; this.y += this.vy; this.life--;
        this.rotation += this.rotSpeed;
        if (this.type === 'nova') this.size *= 0.95;
        if (this.type === 'smoke') {
            this.size *= 1.05;
            this.vy *= 0.9;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        
        if (this.type === 'rune') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Simple rune shapes
            ctx.moveTo(-this.size/2, -this.size/2);
            ctx.lineTo(this.size/2, this.size/2);
            ctx.moveTo(0, -this.size/2);
            ctx.lineTo(0, this.size/2);
            ctx.stroke();
            if (Settings.flashyMode) {
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 5;
                ctx.stroke();
            }
        } 
        else if (this.type === 'smoke') {
            ctx.fillStyle = `rgba(100, 100, 100, ${this.life / this.maxLife})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
            ctx.fill();
        }
        else if (this.type === 'rage_face') {
            ctx.fillStyle = "#ff0000";
            ctx.font = "bold 20px Arial";
            ctx.fillText("💢", this.x, this.y);
        }
        else if (this.type === 'hex') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const hx = this.x + this.size * Math.cos(angle);
                const hy = this.y + this.size * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = this.color;
            ctx.globalAlpha = (this.life / this.maxLife) * 0.3;
            ctx.fill();
        }
        else {
            ctx.fillStyle = this.color;
            if(Settings.flashyMode && this.type === 'nova') ctx.globalCompositeOperation = 'lighter';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        }
        
        ctx.restore();
    }
}