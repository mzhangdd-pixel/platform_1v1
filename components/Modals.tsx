import React, { useState, useEffect } from 'react';
import { Settings } from '../utils/settings';
import { gamepadHandler } from '../game/gamepadHandler';

export const SettingsModal: React.FC<{ isOpen: boolean, onClose: () => void, onPair: () => void }> = ({ isOpen, onClose, onPair }) => {
    const [_, forceUpdate] = useState(0);

    useEffect(() => {
        if (isOpen) Settings.load();
    }, [isOpen]);

    const toggle = (key: keyof typeof Settings) => {
        if (typeof Settings[key] === 'boolean') {
            (Settings as any)[key] = !(Settings as any)[key];
            Settings.save();
            Settings.apply();
            forceUpdate(n => n + 1);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/40 backdrop-blur-sm z-30 flex items-center justify-center">
            <div className="w-[400px] bg-apple-card dark:bg-dark-card p-8 rounded-3xl shadow-2xl text-center">
                <h2 className="text-2xl font-bold mb-6 text-apple-text dark:text-dark-text">游戏设置</h2>
                
                <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-apple-text dark:text-dark-text">手柄设置</span>
                    <button onClick={onPair} className="bg-apple-blue text-white text-xs px-4 py-2 rounded-full hover:bg-blue-600">
                        ⚙️ 配置/链接手柄
                    </button>
                </div>

                <ToggleRow label="无冷却模式 (无限火力)" checked={Settings.noCooldown} onChange={() => toggle('noCooldown')} />
                <ToggleRow label="夜间模式" checked={Settings.nightMode} onChange={() => toggle('nightMode')} />
                <ToggleRow label="极致华丽特效 (耗能)" checked={Settings.flashyMode} onChange={() => toggle('flashyMode')} />
                <ToggleRow label="游戏音效" checked={Settings.audioEnabled} onChange={() => toggle('audioEnabled')} />

                <button onClick={onClose} className="mt-6 w-full py-3 bg-gray-200 dark:bg-gray-700 text-apple-text dark:text-dark-text font-medium rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    关闭
                </button>
            </div>
        </div>
    );
};

const ToggleRow: React.FC<{ label: string, checked: boolean, onChange: () => void }> = ({ label, checked, onChange }) => (
    <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-800 text-sm">
        <span className="text-apple-text dark:text-dark-text">{label}</span>
        <div onClick={onChange} className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-apple-blue' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
        </div>
    </div>
);

export const PairingModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [p1Id, setP1Id] = useState<number|null>(null);
    const [p2Id, setP2Id] = useState<number|null>(null);

    useEffect(() => {
        if (isOpen) {
            gamepadHandler.startPairing();
            gamepadHandler.onPairingUpdate = (s, p1, p2) => {
                setStep(s);
                setP1Id(p1);
                setP2Id(p2);
                if (s === 3) {
                    setTimeout(onClose, 1500);
                }
            };
        } else {
            gamepadHandler.stopPairing();
        }
        return () => { gamepadHandler.onPairingUpdate = null; };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 left-0 w-full h-full bg-black/60 backdrop-blur-md z-40 flex items-center justify-center">
            <div className="w-[400px] bg-apple-card dark:bg-dark-card p-8 rounded-3xl shadow-2xl text-center">
                <h2 className="text-2xl font-bold mb-4 text-apple-text dark:text-dark-text">🎮 手柄配对</h2>
                
                <div className={`text-lg font-bold mb-6 ${step === 1 ? 'text-apple-red' : step === 2 ? 'text-apple-blue' : 'text-apple-green'}`}>
                    {step === 1 ? "等待 P1 配对..." : step === 2 ? "P1 已连接! 等待 P2..." : "配对完成!"}
                </div>

                <p className="text-apple-gray mb-8 leading-relaxed">
                    请 <span className="font-bold text-apple-text dark:text-dark-text">{step === 1 ? "P1" : "P2"}</span> 玩家<br/>
                    同时按住手柄背部的 <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm">ZL</span> + <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm">ZR</span> 键
                </p>

                <div className="text-xs text-apple-gray mb-6">
                    P1 ID: {p1Id !== null ? p1Id : '--'} <br/>
                    P2 ID: {p2Id !== null ? p2Id : '--'}
                </div>

                <button onClick={onClose} className="w-full py-3 bg-apple-blue text-white font-medium rounded-full hover:bg-blue-600 transition-colors">
                    完成 / 跳过
                </button>
            </div>
        </div>
    );
};