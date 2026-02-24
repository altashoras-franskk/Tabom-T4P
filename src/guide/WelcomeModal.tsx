// Welcome Modal - First-time guide prompt with algorithm explanation

import React from 'react';
import { Sparkles, Zap, Atom, Link2, Stars } from 'lucide-react';

interface WelcomeModalProps {
  onStart: () => void;
  onSkip: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStart, onSkip }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[600px] bg-black/90 backdrop-blur-xl border border-cyan-500/20 rounded-xl shadow-2xl overflow-hidden">
        {/* Header with accent */}
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
        
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-cyan-400/80" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-white text-2xl font-light text-center mb-2">
            Tools for Perception
          </h2>
          <p className="text-cyan-400/70 text-sm text-center uppercase tracking-widest font-light mb-8">
            Simulador de Vida Artificial
          </p>
          
          {/* Quick Concept */}
          <div className="mb-8 space-y-4">
            <div className="bg-white/[0.02] rounded-lg p-5 border border-white/[0.06]">
              <div className="flex items-start gap-3 mb-3">
                <Zap className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">O que você está vendo?</h3>
                  <p className="text-white/60 text-xs leading-relaxed">
                    Partículas que <strong className="text-cyan-400">interagem</strong> através de uma matriz de forças (atração/repulsão), 
                    formando <strong className="text-purple-400">padrões emergentes</strong> como membranas, anéis, organismos e estruturas complexas.
                  </p>
                </div>
              </div>
            </div>

            {/* 3 key concepts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-cyan-500/5 rounded-lg p-3 border border-cyan-500/20">
                <div className="flex justify-center mb-1"><Atom className="w-5 h-5 text-cyan-400" /></div>
                <div className="text-white/80 text-[10px] font-medium text-center mb-1">Partículas</div>
                <div className="text-white/40 text-[9px] text-center leading-tight">
                  Tipos diferentes com cores únicas
                </div>
              </div>
              
              <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20">
                <div className="flex justify-center mb-1"><Link2 className="w-5 h-5 text-purple-400" /></div>
                <div className="text-white/80 text-[10px] font-medium text-center mb-1">Matriz de Forças</div>
                <div className="text-white/40 text-[9px] text-center leading-tight">
                  Define como os tipos interagem
                </div>
              </div>
              
              <div className="bg-pink-500/5 rounded-lg p-3 border border-pink-500/20">
                <div className="flex justify-center mb-1"><Stars className="w-5 h-5 text-pink-400" /></div>
                <div className="text-white/80 text-[10px] font-medium text-center mb-1">Emergência</div>
                <div className="text-white/40 text-[9px] text-center leading-tight">
                  Padrões complexos surgem naturalmente
                </div>
              </div>
            </div>
          </div>

          {/* Tutorial suggestion */}
          <div className="space-y-3 mb-6 bg-cyan-500/5 rounded-lg p-4 border border-cyan-500/20">
            <div className="text-cyan-400 text-xs font-medium text-center flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" />
              Primeira vez aqui?
            </div>
            <div className="text-white/60 text-xs text-center leading-relaxed">
              Um tour guiado de <strong className="text-white">60 segundos</strong> vai te mostrar 
              os controles básicos e como explorar o sistema.
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={onStart}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white text-sm font-medium uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-cyan-500/20"
            >
              Iniciar Tour
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2.5 px-4 text-white/40 hover:text-white/80 text-xs uppercase tracking-wider transition-all"
            >
              Explorar sozinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};