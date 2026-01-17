import React, { useState, useEffect, useRef } from 'react';
import { Note, UserPreferences } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, MessageCircle, MoreHorizontal, ArrowLeft, BookOpen, Clock } from 'lucide-react';

interface NoteFeedProps {
    notes: Note[];
    user: UserPreferences;
    onClose: () => void;
}

const FeedCard = ({ note, isActive }: { note: Note; isActive: boolean }) => {
    return (
        <div className="h-full w-full flex items-center justify-center p-4 snap-start relative">
            <div className="w-full h-[90%] max-w-md bg-discord-panel rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative flex flex-col">

                {/* Visual Header / Image Placeholder */}
                <div className={`h-1/3 w-full relative ${isActive ? 'animate-in fade-in zoom-in-105 duration-1000' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-discord-panel z-10"></div>
                    <div className="w-full h-full bg-discord-accent/20 flex items-center justify-center">
                        <BookOpen size={64} className="text-discord-accent opacity-50" />
                    </div>

                    <div className="absolute bottom-4 left-4 z-20">
                        <div className="flex gap-2 mb-2">
                            <span className="px-2 py-1 bg-black/50 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10">
                                {note.folder}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-md">{note.title}</h2>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <p className="text-discord-text text-lg leading-relaxed">
                        {note.aiAnalysis?.summary || note.elements.find(e => e.type === 'text')?.content?.substring(0, 300) || "No summary available for this note yet."}
                    </p>

                    {note.elements.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {note.tags.map(tag => (
                                <span key={tag} className="text-xs text-discord-accent font-bold">#{tag}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Interactions Side Bar (TikTok style) */}
                <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center z-30">
                    <button className="flex flex-col items-center gap-1 group">
                        <div className="w-12 h-12 bg-discord-bg/80 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:text-red-500 transition-colors border border-white/10">
                            <Heart size={24} fill="currentColor" className="opacity-0 group-hover:opacity-100 absolute transition-opacity" />
                            <Heart size={24} className="group-hover:opacity-0 transition-opacity" />
                        </div>
                        <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Like</span>
                    </button>

                    <button className="flex flex-col items-center gap-1 group">
                        <div className="w-12 h-12 bg-discord-bg/80 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:text-blue-400 transition-colors border border-white/10">
                            <MessageCircle size={24} />
                        </div>
                        <span className="text-xs font-bold text-white shadow-black drop-shadow-md">42</span>
                    </button>

                    <button className="flex flex-col items-center gap-1 group">
                        <div className="w-12 h-12 bg-discord-bg/80 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:text-green-400 transition-colors border border-white/10">
                            <Share2 size={24} />
                        </div>
                        <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Share</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const NoteFeed: React.FC<NoteFeedProps> = ({ notes, user, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = () => {
        if (containerRef.current) {
            const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
            setActiveIndex(index);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
            <div className="absolute top-4 left-4 z-50">
                <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10">
                    <ArrowLeft size={24} />
                </button>
            </div>

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ height: '100vh' }}
            >
                {notes.map((note, index) => (
                    <div key={note.id} className="h-full w-full snap-start">
                        <FeedCard note={note} isActive={index === activeIndex} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NoteFeed;
