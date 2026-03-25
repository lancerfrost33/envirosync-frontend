import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';
import './ChatbotWidget.css';

const ChatWizard = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hi! I'm your EnviroSync assistant. I'm here to assist you with everything you need today. What would you like to know?",
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const getUserEmail = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.email || 'anonymous';
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const userEmail = await getUserEmail();

            const response = await axios.post(
                `/api/chatbot/message`,
                { message: inputValue },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Email': userEmail,
                    },
                }
            );

            const botMessage = {
                id: Date.now() + 1,
                text: response.data.reply,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const quickQuestions = [
        "What's my total carbon footprint?",
        "Show me my top emitting projects",
        "How much CO₂ have I saved?",
        "Explain my sustainability score",
    ];

    const handleQuickQuestion = (question) => {
        setInputValue(question);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                className={`chat-wizard-button ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Open chat assistant"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chat-wizard-window">
                    {/* Header */}
                    <div className="chat-wizard-header">
                        <div className="chat-wizard-logo">
                            <div className="chat-wizard-avatar">
                                <img src="/images/icon.png" style={{ objectFit: 'fill' }} alt="logo" />
                            </div>
                            <div className="chat-wizard-title">
                                <h3 style={{ color: 'white' }}>EnviroSync Bot</h3>
                                <span className="chat-wizard-status">Online</span>
                            </div>
                        </div>
                        <button
                            className="chat-wizard-close"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="chat-wizard-messages">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`chat-message ${message.sender === 'user' ? 'user' : 'bot'}`}
                            >
                                {message.sender === 'bot' && (
                                    <div className="chat-message-avatar">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" fill="#379C8A" />
                                        </svg>
                                    </div>
                                )}
                                <div className="chat-message-bubble">
                                    <p>{message.text}</p>
                                    <span className="chat-message-time">
                                        {message.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="chat-message bot">
                                <div className="chat-message-avatar">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" fill="#379C8A" />
                                    </svg>
                                </div>
                                <div className="chat-message-bubble">
                                    <div className="chat-typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Questions */}
                    {messages.length === 1 && !isLoading && (
                        <div className="chat-quick-questions">
                            <p className="chat-quick-questions-label">Quick questions:</p>
                            <div className="chat-quick-questions-grid">
                                {quickQuestions.map((question, index) => (
                                    <button
                                        key={index}
                                        className="chat-quick-question-btn"
                                        onClick={() => handleQuickQuestion(question)}
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="chat-wizard-input-container">
                        <textarea
                            ref={inputRef}
                            className="chat-wizard-input"
                            placeholder="Ask away..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            className="chat-wizard-send"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            aria-label="Send message"
                        >
                            {isLoading ? <Loader2 size={20} className="spinning" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatWizard;