'use client';

// Create hooks/useVapi.ts: the core hook. Initializes Vapi SDK, manages call lifecycle (idle, connecting, starting, listening, thinking, speaking), tracks messages array + currentMessage streaming, session tracking via server actions

import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { useAuth } from '@clerk/nextjs';

import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from '@/lib/constants';
import { getVoice } from '@/lib/utils';
import { IBook, Messages } from '@/types';
import { startVoiceSession, endVoiceSession, saveConversationMessage, getConversationContext } from '@/lib/actions/session.actions';

export function useLatestRef<T>(value: T) {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;
const TIME_WARNING_THRESHOLD = 60; // Show warning when this many seconds remain

let vapi: InstanceType<typeof Vapi>;
function getVapi() {
    if (!vapi) {
        if (!VAPI_API_KEY) {
            throw new Error('NEXT_PUBLIC_VAPI_API_KEY environment variable is not set');
        }
        vapi = new Vapi(VAPI_API_KEY);
    }
    return vapi;
}

export type CallStatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';

export function useVapi(book: IBook) {
    const { userId } = useAuth();

    const [status, setStatus] = useState<CallStatus>('idle');
    const [messages, setMessages] = useState<Messages[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [currentUserMessage, setCurrentUserMessage] = useState('');
    const [duration, setDuration] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isStoppingRef = useRef(false);
    const lastUpdateTimeRef = useRef<number>(0);
    const THROTTLE_MS = 30; // Throttle partial transcripts to every 30ms for smooth streaming
    const messageIndexRef = useRef<number>(0); // Track message count for ordering

    // Keep refs in sync with latest values for use in callbacks
    const durationRef = useLatestRef(duration);
    const voice = book.persona || DEFAULT_VOICE;

    // Set up Vapi event listeners
    useEffect(() => {
        const handlers = {
            'call-start': () => {
                isStoppingRef.current = false;
                setStatus('starting'); // AI speaks first, wait for it
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Start duration timer
                startTimeRef.current = Date.now();
                setDuration(0);
                timerRef.current = setInterval(() => {
                    if (startTimeRef.current) {
                        const newDuration = Math.floor((Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS);
                        setDuration(newDuration);
                    }
                }, TIMER_INTERVAL_MS);
            },

            'call-end': () => {
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Stop timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking
                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session:', err),
                    );
                    sessionIdRef.current = null;
                }

                startTimeRef.current = null;
            },

            'speech-start': () => {
                if (!isStoppingRef.current) {
                    setStatus('speaking');
                }
            },
            'speech-end': () => {
                if (!isStoppingRef.current) {
                    // After AI finishes speaking, user can talk
                    setStatus('listening');
                }
            },

            message: (message: {
                type: string;
                role: string;
                transcriptType: string;
                transcript: string;
            }) => {
                if (message.type !== 'transcript') return;

                // User finished speaking → AI is thinking
                if (message.role === 'user' && message.transcriptType === 'final') {
                    if (!isStoppingRef.current) {
                        setStatus('thinking');
                    }
                    setCurrentUserMessage('');
                }

                // Partial user transcript → show real-time typing (throttled)
                if (message.role === 'user' && message.transcriptType === 'partial') {
                    const now = Date.now();
                    if (now - lastUpdateTimeRef.current >= THROTTLE_MS) {
                        setCurrentUserMessage(message.transcript);
                        lastUpdateTimeRef.current = now;
                    }
                    return;
                }

                // Partial AI transcript → show word-by-word (throttled)
                if (message.role === 'assistant' && message.transcriptType === 'partial') {
                    const now = Date.now();
                    if (now - lastUpdateTimeRef.current >= THROTTLE_MS) {
                        setCurrentMessage(message.transcript);
                        lastUpdateTimeRef.current = now;
                    }
                    return;
                }

                // Final transcript → add to messages
                if (message.transcriptType === 'final') {
                    if (message.role === 'assistant') setCurrentMessage('');
                    if (message.role === 'user') setCurrentUserMessage('');

                    setMessages((prev) => {
                        const isDupe = prev.some(
                            (m) => m.role === message.role && m.content === message.transcript,
                        );
                        if (!isDupe) {
                            // Save message to database
                            if (sessionIdRef.current && userId) {
                                saveConversationMessage(
                                    userId,
                                    sessionIdRef.current,
                                    book._id,
                                    message.role as 'user' | 'assistant',
                                    message.transcript,
                                    messageIndexRef.current
                                ).catch(err => console.error('Failed to save message:', err));
                                messageIndexRef.current++;
                            }
                        }
                        return isDupe ? prev : [...prev, { role: message.role, content: message.transcript }];
                    });
                }
            },

            error: (error: Error) => {
                console.error('Vapi error:', error);
                // Don't reset isStoppingRef here - delayed events may still fire
                setStatus('idle');
                setCurrentMessage('');
                setCurrentUserMessage('');

                // Stop timer on error
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                // End session tracking on error
                if (sessionIdRef.current) {
                    endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                        console.error('Failed to end voice session on error:', err),
                    );
                    sessionIdRef.current = null;
                }

                startTimeRef.current = null;
            },
        };

        // Register all handlers
        Object.entries(handlers).forEach(([event, handler]) => {
            getVapi().on(event as keyof typeof handlers, handler as () => void);
        });

        return () => {
            // End active session on unmount
            if (sessionIdRef.current) {
                getVapi().stop();
                endVoiceSession(sessionIdRef.current, durationRef.current).catch((err) =>
                    console.error('Failed to end voice session on unmount:', err),
                );
                sessionIdRef.current = null;
            }
            // Cleanup handlers
            Object.entries(handlers).forEach(([event, handler]) => {
                getVapi().off(event as keyof typeof handlers, handler as () => void);
            });
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const start = useCallback(async () => {
        if (!userId) {
            console.error('User not authenticated');
            return;
        }

        setStatus('connecting');

        try {
            // Create session record
            const result = await startVoiceSession(userId, book._id);

            if (!result.success) {
                setStatus('idle');
                return;
            }

            sessionIdRef.current = result.sessionId || null;
            messageIndexRef.current = 0; // Reset message index for new session

            // Load conversation history for context
            const contextResult = await getConversationContext(userId, book._id, 10);
            const pastMessages = contextResult.success ? contextResult.messages || [] : [];
            
            // Extract key topics from past messages for Vapi to reference
            const extractTopics = (messages: Array<{role: string; content: string}>) => {
                if (messages.length === 0) return '';
                
                // Get last 3 user messages as topics discussed
                const userMessages = messages
                    .filter(msg => msg.role === 'user')
                    .slice(-3)
                    .map(msg => {
                        // Extract first sentence as topic
                        const topic = msg.content.split('.')[0].substring(0, 60).trim();
                        return topic;
                    })
                    .filter(t => t.length > 0);
                
                if (userMessages.length === 0) return '';
                
                return `[Context: We were discussing - ${userMessages.join('; ')}]`;
            };

            const topicsSummary = extractTopics(pastMessages);
            
            // Determine greeting based on context
            let firstMessage = '';
            let conversationHistory: Array<{ role: string; content: string }> = [];

            if (pastMessages.length > 0) {
                // Returning user - personalized welcome based on book theme
                const greetingMap: Record<string, string> = {
                    'atomic-habits': 'Welcome back to building better each day. I remember where we left off.',
                    'clean-code': 'Welcome back. Let\'s continue crafting better code together.',
                    'the-pragmatic-programmer': 'Welcome back, let\'s keep exploring the pragmatic path.',
                    '72-demons-of-goetia': 'Welcome back. The spirits remember your work with them.',
                    'deep-work': 'Welcome back. Let\'s dive deeper into focus and meaning.',
                    'brave-new-world': 'Welcome back to this strange new world we\'ve been exploring.',
                    'rich-dad-poor-dad': 'Welcome back. Let\'s continue your financial education.',
                    'how-to-win-friends-and-influence-people': 'Welcome back. Ready to dive deeper into human nature?',
                    '1984': 'Welcome back. The truth of {{title}} awaits.',
                };

                firstMessage = greetingMap[book.slug] 
                    || `Welcome back. I remember our conversation about {{title}}. What shall we explore next?`;
                
                firstMessage = firstMessage.replace(/{{title}}/g, book.title);

                // Combine greeting with context for Vapi (context is silent, only greeting is spoken)
                firstMessage = topicsSummary ? `${topicsSummary}\n\n${firstMessage}` : firstMessage;

                // Build conversation history from past messages for context
                conversationHistory = pastMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                console.log(`📚 [useVapi] Returning user - ${pastMessages.length} past messages loaded`, { topics: topicsSummary });
            } else {
                // Fresh start - warm greeting without the reading status question
                const welcomeMap: Record<string, string> = {
                    'atomic-habits': 'Hey, let\'s talk about building better habits and improving every day. What\'s on your mind?',
                    'clean-code': 'Welcome to the world of clean code. What would you like to explore first?',
                    'the-pragmatic-programmer': 'Welcome. Let\'s discuss being a pragmatic programmer. What interests you?',
                    '72-demons-of-goetia': 'Greetings. We stand at the threshold between worlds. What draws you here?',
                    'deep-work': 'Welcome. Let\'s explore deep work and creating meaningfully. What\'s your interest?',
                    'brave-new-world': 'Welcome to this exploration of a strange new world. Where should we start?',
                    'rich-dad-poor-dad': 'Welcome. Let\'s talk about money, assets, and building wealth. What interests you?',
                    'how-to-win-friends-and-influence-people': 'Welcome. Let\'s dive into understanding people and human nature. What sparked your curiosity?',
                    '1984': 'Welcome to {{title}}. A dangerous and vital book. What draws you to it?',
                };

                firstMessage = welcomeMap[book.slug] 
                    || `Hey, I\'m {{title}} by {{author}}. What would you like to explore?`;
                
                firstMessage = firstMessage
                    .replace(/{{title}}/g, book.title)
                    .replace(/{{author}}/g, book.author);

                console.log(`🆕 [useVapi] Fresh start - no history loaded`);
            }

            // Build messages array with conversation history for Vapi
            const messages: Array<{ role: string; content: string }> = [
                ...conversationHistory,
                // Add a system context about the book (silent context, not spoken)
                {
                    role: 'system',
                    content: `You are speaking as the book "${book.title}" by ${book.author}. Your identity comes from the actual content retrieved via searchBook. Keep responses to 2-3 sentences. Always end with a question. Speak naturally as if in conversation.`
                }
            ];

            await getVapi().start(ASSISTANT_ID, {
                firstMessage,
                variableValues: {
                    title: book.title,
                    author: book.author,
                    bookId: book._id,
                    slug: book.slug,
                    conversationContext: topicsSummary,
                },
                voice: {
                    provider: '11labs' as const,
                    voiceId: getVoice(voice).id,
                    model: 'eleven_turbo_v2_5' as const,
                    stability: VOICE_SETTINGS.stability,
                    similarityBoost: VOICE_SETTINGS.similarityBoost,
                    style: VOICE_SETTINGS.style,
                    useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
                },
            });

            console.log(`✅ [useVapi] Call started with ${conversationHistory.length} context messages`);
        } catch (err) {
            console.error('Failed to start call:', err);
            setStatus('idle');
        }
    }, [book._id, book.title, book.author, book.slug, voice, userId]);

    const stop = useCallback(() => {
        isStoppingRef.current = true;
        getVapi().stop();
    }, []);

    const isActive =
        status === 'starting' ||
        status === 'listening' ||
        status === 'thinking' ||
        status === 'speaking';

    return {
        status,
        isActive,
        messages,
        currentMessage,
        currentUserMessage,
        duration,
        start,
        stop,
    };
}

export default useVapi;
