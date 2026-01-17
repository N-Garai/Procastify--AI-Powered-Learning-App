import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { NoteElement } from '../types';
import { MousePointer2, Hand, Type as TypeIcon, StickyNote, Trash2 } from 'lucide-react';

interface CanvasBoardProps {
    elements: NoteElement[];
    onUpdateElements: (elements: NoteElement[]) => void;
    readOnly?: boolean;
}

const STICKY_COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#f3e8ff'];
const DEFAULT_TEXT_WIDTH = 400;
const DEFAULT_STICKY_WIDTH = 240;

const getFontSizeClass = (size?: string) => {
    switch (size) {
        case 'small': return 'text-sm text-white/70';
        case 'large': return 'text-2xl font-bold text-white';
        default: return 'text-base text-white/90'; // medium
    }
};

const AutoResizingTextarea = ({
    element,
    updateElement,
    removeElement,
    addElement,
    isEditing,
    setEditingId
}: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [element.content, element.fontSize, isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const newY = element.y + (element.height || 40) + 16;
            addElement('text', element.x, newY);
        }
        if (e.key === 'Backspace' && !element.content) {
            removeElement(element.id);
        }
    };

    const fontSizeClass = getFontSizeClass(element.fontSize);

    if (!isEditing) {
        return (
            <div
                className={`w-full p-2 leading-relaxed whitespace-pre-wrap cursor-text ${fontSizeClass} ${!element.content ? 'text-white/20 italic' : ''}`}
                style={{ minHeight: '40px' }}
            >
                {element.content || 'Empty block'}
            </div>
        );
    }

    return (
        <textarea
            ref={textareaRef}
            autoFocus
            className={`w-full bg-transparent resize-none focus:outline-none font-sans overflow-hidden p-2 leading-relaxed ${fontSizeClass}`}
            placeholder="Type something..."
            value={element.content || ''}
            onChange={(e) => updateElement(element.id, { content: e.target.value })}
            onKeyDown={handleKeyDown}
            onBlur={() => setEditingId(null)}
            onMouseDown={(e) => e.stopPropagation()}
        />
    );
};

const CanvasBoard: React.FC<CanvasBoardProps> = ({ elements, onUpdateElements, readOnly = false }) => {
    // Camera state
    const [view, setView] = useState({ x: 0, y: 0, scale: 1 });

    // Tools & Interaction State
    const [tool, setTool] = useState<'select' | 'hand' | 'text' | 'sticky'>('select');
    const [isPanning, setIsPanning] = useState(false);

    // Refs for RAF (Request Animation Frame) to decouple state updates from 60fps events
    const viewRef = useRef(view);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const dragRef = useRef<{ id: string, startX: number, startY: number, offsetX: number, offsetY: number } | null>(null);

    const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [editingElementId, setEditingElementId] = useState<string | null>(null);

    // Sync refs with state, but careful not to cause loops
    useEffect(() => { viewRef.current = view; }, [view]);

    const getCanvasCoords = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - view.x) / view.scale,
            y: (e.clientY - rect.top - view.y) / view.scale
        };
    };

    const addElement = (type: NoteElement['type'], x: number, y: number, content: string = '') => {
        const newEl: NoteElement = {
            id: Date.now().toString(),
            type,
            x,
            y,
            width: type === 'text' ? DEFAULT_TEXT_WIDTH : DEFAULT_STICKY_WIDTH,
            height: type === 'text' ? 40 : 240,
            content: content,
            color: type === 'sticky' ? STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)] : undefined,
            zIndex: (elements.length || 0) + 1,
            fontSize: 'medium'
        };

        onUpdateElements([...elements, newEl]);

        if (type === 'text' || type === 'sticky') {
            setEditingElementId(newEl.id);
            setSelectedElementId(newEl.id);
            setTool('select');
        }
    };

    const updateElement = (id: string, updates: Partial<NoteElement>) => {
        onUpdateElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const removeElement = (id: string) => {
        onUpdateElements(elements.filter(el => el.id !== id));
        setSelectedElementId(null);
        setEditingElementId(null);
    };

    // --- High Performance Handlers ---

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (tool === 'hand' || e.button === 1 || e.ctrlKey) {
            setIsPanning(true);
            isPanningRef.current = true;
            // Store client coords
            panStartRef.current = {
                x: e.clientX - view.x,
                y: e.clientY - view.y
            };
            return;
        }

        if (readOnly) return;

        if (tool === 'text' || tool === 'sticky') {
            const coords = getCanvasCoords(e);
            addElement(tool, coords.x, coords.y);
            return;
        }

        if (tool === 'select') {
            setSelectedElementId(null);
            setEditingElementId(null);
        }
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        // Panning Logic with RAF not strictly needed for React state unless heavy, 
        // but good for structure. Here we just set state directly as it's the viewport.
        if (isPanningRef.current) {
            requestAnimationFrame(() => {
                setView(v => ({
                    ...v,
                    x: e.clientX - panStartRef.current.x,
                    y: e.clientY - panStartRef.current.y
                }));
            });
            return;
        }

        // Dragging Element Logic
        if (dragRef.current && tool === 'select' && !readOnly) {
            const { id, offsetX, offsetY } = dragRef.current;

            // Calculate new position in canvas space
            // We use viewRef to get latest view without dependency cycle
            const currentView = viewRef.current;
            const mouseCanvasX = (e.clientX - currentView.x) / currentView.scale;
            const mouseCanvasY = (e.clientY - currentView.y) / currentView.scale;

            requestAnimationFrame(() => {
                onUpdateElements(elements.map(el => {
                    if (el.id === id) {
                        return {
                            ...el,
                            x: mouseCanvasX - offsetX,
                            y: mouseCanvasY - offsetY
                        };
                    }
                    return el;
                }));
            });
        }
    }, [elements, onUpdateElements, tool, readOnly]); // Dependencies for Drag

    const handleMouseUp = (e: React.MouseEvent) => {
        if (dragRef.current) {
            const dist = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
            if (dist < 5) {
                // It was a click, not a drag
                const elId = dragRef.current.id;
                const el = elements.find(x => x.id === elId);
                if (el && (el.type === 'text' || el.type === 'sticky')) {
                    setEditingElementId(elId);
                }
            }
            dragRef.current = null;
            setDraggedElementId(null);
        }

        setIsPanning(false);
        isPanningRef.current = false;
    };

    const handleElementMouseDown = (e: React.MouseEvent, elId: string, elX: number, elY: number) => {
        e.stopPropagation();
        if (readOnly) return;
        if (editingElementId === elId) return;

        if (tool === 'select') {
            setSelectedElementId(elId);
            setDraggedElementId(elId);

            const mouseCanvasX = (e.clientX - view.x) / view.scale;
            const mouseCanvasY = (e.clientY - view.y) / view.scale;

            dragRef.current = {
                id: elId,
                startX: e.clientX,
                startY: e.clientY,
                offsetX: mouseCanvasX - elX,
                offsetY: mouseCanvasY - elY
            };
        }
    };

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Throttled Zoom
            requestAnimationFrame(() => {
                setView(v => {
                    const scaleAmount = -e.deltaY * 0.001;
                    const newScale = Math.min(Math.max(0.1, v.scale + scaleAmount), 5);
                    return { ...v, scale: newScale };
                });
            });
        }
    }, []);

    return (
        <div className="flex flex-col h-full relative overflow-hidden bg-[#1e1f22]">
            {/* Toolbar */}
            {!readOnly && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#111] p-1.5 rounded-xl border border-white/10 shadow-xl">
                    {[
                        { t: 'select', i: MousePointer2, label: 'Select (V)' },
                        { t: 'hand', i: Hand, label: 'Pan (H)' },
                        { t: 'text', i: TypeIcon, label: 'Text Block' },
                        { t: 'sticky', i: StickyNote, label: 'Post-it' },
                    ].map((item: any) => (
                        <button
                            key={item.t}
                            onClick={() => setTool(item.t)}
                            title={item.label}
                            className={`p-2 rounded-lg transition-all ${tool === item.t ? 'bg-discord-accent text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <item.i size={18} />
                        </button>
                    ))}
                    <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
                    <div className="text-xs text-center min-w-[3ch] text-gray-400">{Math.round(view.scale * 100)}%</div>
                </div>
            )}

            {/* Canvas Area */}
            <div
                className={`flex-1 relative w-full h-full overflow-hidden ${tool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* Grid Background - Decoupled with CSS transform can be smoother, but state-based is OK with RAF */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.08]"
                    style={{
                        backgroundImage: 'radial-gradient(#fff 1.5px, transparent 1.5px)',
                        backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`,
                        backgroundPosition: `${view.x}px ${view.y}px`
                    }}
                />

                {/* Content Layer */}
                <div
                    style={{
                        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                        transformOrigin: '0 0',
                        width: '100%', height: '100%',
                        willChange: 'transform' // GPU Hint
                    }}
                >
                    {elements.map(el => {
                        const isSelected = selectedElementId === el.id;
                        const isEditing = editingElementId === el.id;

                        return (
                            <div
                                key={el.id}
                                onMouseDown={(e) => handleElementMouseDown(e, el.id, el.x, el.y)}
                                style={{
                                    position: 'absolute',
                                    left: el.x,
                                    top: el.y,
                                    width: el.width,
                                    zIndex: el.zIndex,
                                    backgroundColor: el.type === 'sticky' ? el.color : 'transparent',
                                    boxShadow: draggedElementId === el.id ? '0 10px 30px -10px rgba(0,0,0,0.5)' : el.type === 'sticky' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                    outline: isSelected && !isEditing ? (el.type === 'text' ? '2px dashed rgba(255,255,255,0.2)' : '2px solid #5865F2') : 'none',
                                    outlineOffset: '4px',
                                    borderRadius: el.type === 'sticky' ? '2px' : '4px',
                                    cursor: tool === 'select' && !readOnly ? 'move' : 'text'
                                }}
                            >
                                {/* Edit Toolbar */}
                                {isSelected && !isEditing && !readOnly && (
                                    <div className="absolute -top-10 left-0 bg-[#1e1f22] border border-white/10 rounded-lg flex items-center p-1 shadow-xl z-50">
                                        <button onClick={() => removeElement(el.id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}

                                {(el.type === 'text' || el.type === 'summary_card') && (
                                    <AutoResizingTextarea
                                        element={el}
                                        updateElement={updateElement}
                                        removeElement={removeElement}
                                        addElement={addElement}
                                        isEditing={isEditing}
                                        setEditingId={setEditingElementId}
                                    />
                                )}

                                {el.type === 'sticky' && (
                                    <div className="w-full h-full p-4 flex flex-col min-h-[160px]">
                                        {isEditing ? (
                                            <textarea
                                                autoFocus
                                                className="w-full h-full bg-transparent resize-none focus:outline-none font-sans text-gray-800 text-sm leading-relaxed"
                                                value={el.content}
                                                onChange={(e) => updateElement(el.id, { content: e.target.value })}
                                                onBlur={() => setEditingElementId(null)}
                                            />
                                        ) : (
                                            <div className="w-full h-full text-gray-800 text-sm leading-relaxed whitespace-pre-wrap cursor-text">
                                                {el.content || 'Empty note'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CanvasBoard;
