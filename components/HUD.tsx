import React, { useEffect, useRef } from 'react';
import { GameUIState, PlayerUIInfo } from '../types';

interface HUDProps {
    uiState: GameUIState;
}

const PlayerHUD: React.FC<{ info: PlayerUIInfo, isRight?: boolean }> = ({ info, isRight }) => {
    const alignClass = isRight ? 'items-end text-right' : 'items-start text-left';
    const barAlign = isRight ? 'flex-row-reverse' : 'flex-row';
    const nameColor = isRight ? 'text-apple-blue' : 'text-apple-red';
    const pLabel = isRight ? 'P2' : 'P1';
    
    const getPct = (val: number, max: number) => Math.min(100, Math.max(0, (val / max) * 100));

    // Absolute width calculation: e.g., 40px per 1 HP
    const hpBarWidth = info.maxHp * 30; 

    return (
        <div className={`flex flex-col w-[350px] p-4 ${alignClass} text-apple-text dark:text-dark-text pointer-events-none`}>
            <div className={`text-lg font-bold ${nameColor}`}>{pLabel}: {info.icon} {info.name}</div>
            <div className="text-xs text-apple-gray dark:text-dark-gray mt-1">
                {isRight ? `HP: ${Math.ceil(info.hp)} | Lives: ${info.lives}` : `Lives: ${info.lives} | HP: ${Math.ceil(info.hp)}`}
            </div>
            
            {/* HP BAR (Absolute Length) */}
            <div 
                className={`h-4 bg-gray-300/30 mt-2 rounded overflow-hidden relative flex border border-black/10 ${barAlign}`}
                style={{ width: `${hpBarWidth}px` }}
            >
                <div 
                    className="h-full bg-apple-red transition-all duration-100 ease-linear"
                    style={{ width: `${getPct(info.hp, info.maxHp)}%` }}
                ></div>
            </div>

            {/* RESOURCE BAR */}
            <div className={`w-full h-2 bg-gray-300/20 mt-2 rounded overflow-hidden relative flex ${barAlign}`}>
                <div 
                    className="h-full bg-apple-blue transition-all duration-100 ease-linear rounded"
                    style={{ width: `${getPct(info.resource, info.maxResource)}%` }}
                ></div>
            </div>

            {/* CDS */}
            <div className={`flex mt-3 gap-2 ${isRight ? 'justify-end' : 'justify-start'}`}>
                {/* Attack CD is mostly visual flash since it's very short now, but we keep it */}
                <CooldownBox label={isRight?",":"X"} current={info.cdAtk} max={info.cdAtkMax} />
                <CooldownBox label={isRight?".":"C"} current={info.cdSkill} max={600} />
                <CooldownBox label={isRight?"/":"V"} current={info.cdUlt} max={info.cdUltMax} />
                <CooldownBox label={isRight?";":"F"} current={info.cdSwap} max={600} />
            </div>
        </div>
    );
};

const CooldownBox: React.FC<{ label: string, current: number, max: number }> = ({ label, current, max }) => {
    const pct = Math.min(100, Math.max(0, (current / max) * 100));
    const seconds = Math.ceil(current / 60);

    return (
        <div className="w-8 h-8 bg-gray-500/10 border border-apple-border dark:border-dark-border rounded-lg flex items-center justify-center text-xs font-bold relative overflow-hidden text-apple-text dark:text-dark-text">
            <span className="z-10">{seconds > 0 ? seconds : label}</span>
            <div 
                className="absolute bottom-0 left-0 w-full bg-black/50 transition-all duration-75"
                style={{ height: `${pct}%` }}
            ></div>
        </div>
    );
};

export const HUD: React.FC<HUDProps> = ({ uiState }) => {
    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-between box-border z-10">
             {/* Gamepad Status */}
             <div className="absolute top-3 left-5 text-xs text-apple-gray dark:text-dark-gray flex items-center gap-2 transition-opacity duration-500">
                <div className="w-4 h-3 bg-gray-400 rounded-sm"></div>
                P1: {uiState.gamepadStatus.p1 ? 'Active' : 'Off'} | P2: {uiState.gamepadStatus.p2 ? 'Active' : 'Off'}
            </div>

            <PlayerHUD info={uiState.p1} />
            
            <div className="text-center mt-4">
                <div className="text-2xl font-extrabold text-apple-text dark:text-dark-text">VS</div>
                <div className="text-sm text-apple-gray dark:text-dark-gray tabular-nums">{uiState.timer}</div>
            </div>

            <PlayerHUD info={uiState.p2} isRight />
        </div>
    );
};