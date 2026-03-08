'use client';

import React, { useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { X, SendHorizontal, Sparkles, Loader2, Image as ImageIcon, LayoutTemplate } from 'lucide-react';

export default function AIChatSidebar({ isOpen, onClose, canvasElements, onAddImage, onUpdateCanvas }) {
    const { messages, input, handleInputChange, handleSubmit, isLoading, addToolResult } = useChat({
        api: '/api/chat',
        body: {
            canvasElements
        }
    });

    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle incoming client-side tool calls automatically
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role !== 'assistant' || !lastMsg.toolInvocations) return;

        lastMsg.toolInvocations.forEach(toolInvocation => {
            if (toolInvocation.toolName === 'updateCanvas' && toolInvocation.state === 'call') {
                // Execute the canvas action
                if (onUpdateCanvas) {
                    onUpdateCanvas(toolInvocation.args);
                }
                // Tell the AI it succeeded
                addToolResult({
                    toolCallId: toolInvocation.toolCallId,
                    result: 'Canvas updated successfully.'
                });
            }
        });
    }, [messages, onUpdateCanvas, addToolResult]);

    // Don't render anything if closed
    if (!isOpen) return null;

    return (
        <div className={`fixed top-0 right-0 h-full w-[350px] bg-white border-l border-gray-200 shadow-2xl flex flex-col z-[9999] transform transition-transform duration-300 ease-in-out font-sans ${isOpen ? 'translate-x-[0%]' : 'translate-x-[100%]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="font-semibold text-gray-800 text-lg">PrisMap AI</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                    title="Close PrisMap AI"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/20">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3 opacity-60">
                        <Sparkles className="w-12 h-12 text-blue-400 mb-2" />
                        <p className="text-gray-600 font-medium">How can I help you design today?</p>
                        <p className="text-sm text-gray-400">Ask for ideas, text generation, or design tips.</p>
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className="w-full flex flex-col space-y-2">
                            {m.content && (
                                <div className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed ${m.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                                    </div>
                                </div>
                            )}

                            {/* Tool Invocations UI */}
                            {m.toolInvocations?.map((toolInvocation) => {
                                const toolCallId = toolInvocation.toolCallId;

                                if (toolInvocation.toolName === 'generateImage' && toolInvocation.state === 'result') {
                                    const { imageUrl, prompt } = toolInvocation.result;
                                    return (
                                        <div key={toolCallId} className="flex flex-col gap-2 max-w-[85%] bg-white border border-gray-100 rounded-2xl p-3 shadow-sm rounded-bl-sm self-start">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                                <ImageIcon size={14} /> Generated Asset
                                            </div>
                                            <img src={imageUrl} alt={prompt} className="w-full h-auto rounded-lg border border-gray-100" />
                                            <button
                                                onClick={() => onAddImage && onAddImage(imageUrl)}
                                                className="mt-2 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-sm rounded-lg transition-colors flex justify-center items-center gap-2"
                                            >
                                                <Sparkles size={14} /> Add to Canvas
                                            </button>
                                        </div>
                                    );
                                }

                                if (toolInvocation.toolName === 'updateCanvas' && (toolInvocation.state === 'call' || toolInvocation.state === 'result')) {
                                    return (
                                        <div key={toolCallId} className="flex justify-start">
                                            <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2 text-sm max-w-[85%]">
                                                <LayoutTemplate className="w-4 h-4 text-green-600 shrink-0" />
                                                <span className="font-medium whitespace-pre-wrap break-words leading-tight">{toolInvocation.args.explanation}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">PrisMap AI is thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
                >
                    <input
                        className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-sm py-1 min-w-0"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask PrisMap AI something..."
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input?.trim()}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 focus:bg-blue-100 rounded-full transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        <SendHorizontal className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
