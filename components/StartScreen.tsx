import React, { useEffect } from 'react';
import { CHARACTERS } from '../constants';
import { SelectionState } from '../types';
import { gamepadHandler } from '../game/gamepadHandler';

interface StartScreenProps {
    p1State: SelectionState;
    p2State: SelectionState;
    onSelect: (player: 'p1' | 'p2', index: number) => void;
    onConfirm: (player: 'p1' | 'p2') => void;
    onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ p1State, p2State, onSelect, onConfirm, onStart }) => {
    const charKeys = Object.keys(CHARACTERS);

    useEffect(() => {
        gamepadHandler.onMenuMove = (player, dir) => {
            const currentState = player === 'p1' ? p1State : p2State;
            if (currentState.confirmed) return;
            let newIndex = currentState.index + dir;
            if (newIndex < 0) newIndex = charKeys.length - 1;
            if (newIndex >= charKeys.length) newIndex = 0;
            onSelect(player, newIndex);
        };
        gamepadHandler.onMenuSelect = (player) => {
            onConfirm(player);
        };
        return () => {
            gamepadHandler.onMenuMove = null;
            gamepadHandler.onMenuSelect = null;
        };
    }, [p1State, p2State, onSelect, onConfirm, charKeys.length]);

    const canStart = p1State.confirmed && p2State.confirmed;

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-white/80 dark:bg-black/80 backdrop-blur-xl z-20 flex flex-col items-center justify-center transition-all duration-500">
            <h1 className="text-5xl font-bold tracking-tight mb-2 text-apple-text dark:text-dark-text">Choose Your Fighter</h1>
            <p className="text-lg text-apple-gray mb-10">P1 (Left Click / A) &nbsp;|&nbsp; P2 (Right Click / A)</p>

            <div className="flex gap-5 mb-10 flex-wrap justify-center max-w-[800px]">
                {charKeys.map((key, idx) => {
                    const char = CHARACTERS[key];
                    const isP1Hover = p1State.index === idx;
                    const isP2Hover = p2State.index === idx;
                    const isP1Locked = p1State.confirmed && p1State.index === idx;
                    const isP2Locked = p2State.confirmed && p2State.index === idx;

                    let borderClass = "border-apple-border dark:border-dark-border";
                    let bgClass = "bg-apple-card dark:bg-dark-card";
                    
                    if (isP1Locked && isP2Locked) {
                        borderClass = "border-apple-purple";
                        bgClass = "bg-purple-500/10";
                    } else if (isP1Locked) {
                        borderClass = "border-apple-red";
                        bgClass = "bg-red-500/10";
                    } else if (isP2Locked) {
                        borderClass = "border-apple-blue";
                        bgClass = "bg-blue-500/10";
                    }

                    return (
                        <div 
                            key={key}
                            className={`w-[100px] h-[160px] border rounded-2xl cursor-pointer flex flex-col items-center justify-center transition-all duration-300 relative p-2 text-center shadow-sm hover:-translate-y-1 hover:shadow-lg ${borderClass} ${bgClass}`}
                            onClick={() => { onSelect('p1', idx); onConfirm('p1'); }}
                            onContextMenu={(e) => { e.preventDefault(); onSelect('p2', idx); onConfirm('p2'); }}
                        >
                            {isP1Hover && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-apple-red text-xl animate-bounce-custom">🔻</span>}
                            {isP2Hover && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-apple-blue text-xl animate-bounce-custom" style={isP1Hover ? {top: '-25px'} : {}}>🔻</span>}
                            
                            <div className="text-4xl mb-2">{char.icon}</div>
                            <h3 className="text-sm font-semibold text-apple-text dark:text-dark-text my-1">{char.name}</h3>
                            <div className="text-[10px] text-apple-gray leading-tight">HP: {char.hp}<br/>{char.desc}</div>
                        </div>
                    )
                })}
            </div>

            {canStart && (
                <button 
                    onClick={onStart}
                    className="mt-5 px-10 py-3 text-lg font-medium bg-apple-blue text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg"
                >
                    开始对战
                </button>
            )}

            <div className="mt-10 text-xs text-apple-gray bg-gray-100/50 dark:bg-white/5 p-5 rounded-xl text-center">
                <p className="font-bold mb-2 text-apple-text dark:text-dark-text">按 <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded">ESC</span> 打开游戏设置</p>
                <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-left">
                    <div className="font-semibold text-apple-text dark:text-dark-text">动作</div>
                    <div className="text-apple-red font-semibold">P1 (Key/Pad)</div>
                    <div className="text-apple-blue font-semibold">P2 (Key/Pad)</div>
                    
                    <div>移动</div><div>WASD / Stick</div><div>IJKL / Stick</div>
                    <div>跳跃</div><div>W / B</div><div>I / B</div>
                    <div>攻击</div><div>X / ZR</div><div>, / ZR</div>
                    <div>技能</div><div>C / A</div><div>. / A</div>
                    <div>大招</div><div>V / X</div><div>/ / X</div>
                    <div>换位</div><div>F / ZL</div><div>; / ZL</div>
                </div>
            </div>
        </div>
    );
};