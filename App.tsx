import React, { useEffect, useRef, useState } from 'react';
import { CANVAS_W, CANVAS_H, CHARACTERS } from './constants';
import { GameState, gameStateInstance } from './game/gameState';
import { Player } from './game/classes/Player';
import { Settings } from './utils/settings';
import { gamepadHandler } from './game/gamepadHandler';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { PairingModal, SettingsModal } from './components/Modals';
import { SelectionState, GameUIState, PlayerUIInfo } from './types';

// Key mapping
const keys: Record<string, boolean> = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
    
    // UI State (Start Screen)
    const [p1Sel, setP1Sel] = useState<SelectionState>({ index: 0, confirmed: false });
    const [p2Sel, setP2Sel] = useState<SelectionState>({ index: 1, confirmed: false });
    
    // UI State (HUD)
    const [uiState, setUiState] = useState<GameUIState>({
        p1: {} as PlayerUIInfo, p2: {} as PlayerUIInfo, timer: '00:00', gamepadStatus: { p1: false, p2: false }
    });

    // Modal State
    const [showSettings, setShowSettings] = useState(false);
    const [showPairing, setShowPairing] = useState(false);

    const gs = gameStateInstance;

    // Initialize Game Loop
    useEffect(() => {
        Settings.load();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        let lastTime = 0;

        const loop = (timestamp: number) => {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            
            if (gameState === 'playing' || gameState === 'gameover') {
                updateGame(ctx);
            } else if (gameState === 'menu') {
                gamepadHandler.update(true);
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [gameState]);

    // Global Key listener for Settings
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowSettings(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Pause game when settings open
    useEffect(() => {
        if (gameState === 'playing' && showSettings) setGameState('paused');
        if (gameState === 'paused' && !showSettings) setGameState('playing');
    }, [showSettings]);

    const startGame = () => {
        const charKeys = Object.keys(CHARACTERS);
        const p1Key = charKeys[p1Sel.index];
        const p2Key = charKeys[p2Sel.index];
        
        gs.resetMap();
        gs.projectiles = [];
        gs.particles = [];
        gs.popups = [];
        gs.globalTime = 0;
        
        gs.players = [
            new Player(1, p1Key, 100, 200),
            new Player(2, p2Key, 900, 200)
        ];

        setGameState('playing');
    };

    const updateGame = (ctx: CanvasRenderingContext2D) => {
        if (gameState === 'paused') return;

        gs.spikeState.timer++;
        gs.spikeState.active = (gs.spikeState.timer % 300) < 180;
        if (gs.spikeState.timer % 60 === 0) gs.globalTime++;

        gamepadHandler.update(false);

        // Clear & Draw Background
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        
        // Draw Platforms
        gs.platforms.forEach(p => {
            if (p.level === 1) ctx.fillStyle = gs.spikeState.active ? "#ff3b30" : (Settings.nightMode ? "#333" : "#1d1d1f");
            else if (p.level === 2) ctx.fillStyle = "#4cd964";
            else if (p.level === 3) ctx.fillStyle = "#ff9500";
            else if (p.level === 4) ctx.fillStyle = "#007aff";
            
            if (Settings.flashyMode && p.level !== 1) {
                ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle as string;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 5); ctx.fill();
            ctx.shadowBlur = 0;
            
            if (p.level === 1 && gs.spikeState.active) {
                ctx.fillStyle = "#ff3b30";
                for(let i=p.x; i<p.x+p.w; i+=20) {
                    ctx.beginPath(); ctx.moveTo(i, p.y); ctx.lineTo(i+10, p.y-15); ctx.lineTo(i+20, p.y); ctx.fill();
                }
                gs.players.forEach(pl => {
                    if (pl.grounded && pl.platform === p && !pl.invisible) {
                        if (gs.spikeState.timer % 60 === 0) pl.takeDamage(1, 'spike');
                    }
                });
            }
        });

        // Draw Map Text
        ctx.fillStyle = "#86868b";
        ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Level 2: Jump x1.5", 150, 525);
        ctx.fillText("Level 3: Slow", 50, 375);
        ctx.fillText("Level 4: Speed x2", 450, 225);

        // Update Logic
        gs.players.forEach(p => { 
            // Inject input from gamepad or keys
            const gp = gamepadHandler.getPlayerInput(p.id as 1|2);
            if (gp) {
                // Deadzone check logic inside gamepadhandler? No, do it here for simplicity
                const rawX = gp.axes[0];
                const rawY = gp.axes[1];
                if (Math.abs(rawX) > 0.15) p.move(rawX);
                else p.move(0);

                if (rawY > 0.5) p.dropDown();
                
                p.isAtkHeld = gp.buttons[7].pressed; // ZR
                // Button mapping manual override for update loop
                const activeKeys = {...keys}; // Clone global keys
                // Map Gamepad buttons to "Virtual Keys" inside Player update
                if (gp.buttons[0].pressed) p.jump();
                if (gp.buttons[1].pressed) p.useSkill();
                if (gp.buttons[3].pressed) p.useUlt();
                if (gp.buttons[6].pressed) p.useSwap();
                
                p.update(activeKeys);
            } else {
                p.update(keys);
            }
            p.draw(ctx); 
        });

        gs.projectiles = gs.projectiles.filter(p => p.active);
        gs.projectiles.forEach(p => { p.update(); p.draw(ctx); });

        gs.particles = gs.particles.filter(p => p.life > 0);
        gs.particles.forEach(p => { p.update(); p.draw(ctx); });

        gs.popups = gs.popups.filter(p => p.life > 0);
        gs.popups.forEach(p => {
            p.life--; p.y -= 0.5;
            ctx.fillStyle = p.color;
            ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.fillText(p.text, p.x, p.y);
        });

        // Game Over Check
        const aliveCount = gs.players.filter(p => p.lives > 0).length;
        if (aliveCount < 2 && gameState === 'playing') {
             // Simple delay then game over
             const winner = gs.players.find(p => p.lives > 0);
             if (winner) {
                 // Draw Game Over Overlay directly on canvas for now or use React overlay
                 // We'll stick to React overlay via setGameState
             }
             // Note: Original code reloaded page. We will just show game over text.
        }

        // Sync UI State (Optimized: Only every few frames if needed, but simple for now)
        if (gs.players.length === 2) {
            const p1 = gs.players[0];
            const p2 = gs.players[1];
            
            // Get max CD values
            const getUltMax = (key: string) => (key === 'ghost') ? 600 : (key === 'demolitionist' ? 900 : (key === 'illusionist' ? 1200 : 1080));

            setUiState({
                timer: `${Math.floor(gs.globalTime / 60)}:${(gs.globalTime % 60).toString().padStart(2,'0')}`,
                gamepadStatus: { p1: gamepadHandler.controllers.p1 !== null, p2: gamepadHandler.controllers.p2 !== null },
                p1: {
                    hp: p1.hp, maxHp: p1.maxHp, lives: p1.lives, resource: p1.resource, maxResource: p1.stats.maxResource,
                    name: p1.stats.name, icon: p1.stats.icon,
                    cdAtk: p1.cdAtk, cdSkill: p1.cdSkill, cdUlt: p1.cdUlt, cdSwap: p1.cdSwap,
                    cdAtkMax: 30, cdSkillMax: 600, cdUltMax: getUltMax(p1.charKey), cdSwapMax: 600
                },
                p2: {
                    hp: p2.hp, maxHp: p2.maxHp, lives: p2.lives, resource: p2.resource, maxResource: p2.stats.maxResource,
                    name: p2.stats.name, icon: p2.stats.icon,
                    cdAtk: p2.cdAtk, cdSkill: p2.cdSkill, cdUlt: p2.cdUlt, cdSwap: p2.cdSwap,
                    cdAtkMax: 30, cdSkillMax: 600, cdUltMax: getUltMax(p2.charKey), cdSwapMax: 600
                }
            });
        }
    };

    return (
        <div className="relative w-[1000px] h-[700px] bg-apple-card dark:bg-dark-card rounded-[18px] shadow-2xl overflow-hidden mx-auto my-10 border border-apple-border dark:border-dark-border transition-colors duration-500">
            <canvas 
                ref={canvasRef} 
                width={CANVAS_W} 
                height={CANVAS_H}
                className="block w-full h-full"
            />

            {gameState === 'playing' && <HUD uiState={uiState} />}
            
            {gameState === 'menu' && (
                <StartScreen 
                    p1State={p1Sel} 
                    p2State={p2Sel} 
                    onSelect={(p, i) => p === 'p1' ? setP1Sel(prev => ({...prev, index: i})) : setP2Sel(prev => ({...prev, index: i}))}
                    onConfirm={(p) => p === 'p1' ? setP1Sel(prev => ({...prev, confirmed: true})) : setP2Sel(prev => ({...prev, confirmed: true}))}
                    onStart={startGame}
                />
            )}

            <SettingsModal 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
                onPair={() => { setShowSettings(false); setShowPairing(true); }}
            />

            <PairingModal 
                isOpen={showPairing} 
                onClose={() => { setShowPairing(false); setShowSettings(true); }} 
            />

            {/* Game Over Overlay */}
            {gameState === 'playing' && gs.players.some(p => p.lives <= 0) && gs.players.filter(p => p.lives > 0).length < 2 && (
                 <div className="absolute top-0 left-0 w-full h-full bg-white/80 dark:bg-black/80 backdrop-blur flex items-center justify-center z-50 animate-in fade-in duration-1000">
                     <div className="text-center">
                         <h1 className="text-6xl font-bold text-apple-text dark:text-dark-text mb-4">
                             {gs.players[0].lives > 0 ? "P1 WINS!" : "P2 WINS!"}
                         </h1>
                         <button 
                             onClick={() => window.location.reload()} 
                             className="bg-apple-blue text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
                         >
                             Play Again
                         </button>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default App;