'use server';

import {EndSessionResult, StartSessionResult, Messages} from "@/types"; 
import {connectToDatabase} from "@/database/mongoose";
import VoiceSession from "@/database/models/voice-session.model";
import ConversationMessage from "@/database/models/conversation-message.model";

export const startVoiceSession = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {
    try {
        await connectToDatabase();

        const session = await VoiceSession.create({
            clerkId,
            bookId,
            startedAt: new Date(),
            durationSeconds: 0,
        });

        return {
            success: true,
            sessionId: session._id.toString(),
        }
    } catch (e) {
        console.error('Error starting voice session', e);
        return { success: false, error: 'Failed to start voice session. Please try again later.' }
    }
}

export const endVoiceSession = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {
    try {
        await connectToDatabase();

        const result = await VoiceSession.findByIdAndUpdate(sessionId, {
            endedAt: new Date(),
            durationSeconds,
        });

        if(!result) return { success: false, error: 'Voice session not found.' }

        return { success: true }
    } catch (e) {
        console.error('Error ending voice session', e);
        return { success: false, error: 'Failed to end voice session. Please try again later.' }
    }
}

// Save a message to conversation history
export const saveConversationMessage = async (
    clerkId: string, 
    sessionId: string, 
    bookId: string, 
    role: 'user' | 'assistant', 
    content: string,
    messageIndex: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        await connectToDatabase();

        await ConversationMessage.create({
            clerkId,
            sessionId,
            bookId,
            role,
            content,
            messageIndex,
        });

        return { success: true };
    } catch (e) {
        console.error('Error saving conversation message', e);
        return { success: false, error: 'Failed to save message.' };
    }
};

// Get conversation history for a user in a specific book (recent messages to maintain context)
export const getConversationContext = async (
    clerkId: string, 
    bookId: string, 
    limit: number = 10
): Promise<{ success: boolean; messages?: Messages[]; error?: string }> => {
    try {
        await connectToDatabase();

        const messages = await ConversationMessage.find({
            clerkId,
            bookId,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Reverse to get chronological order
        const orderedMessages: Messages[] = messages
            .reverse()
            .map((msg: any) => ({
                role: msg.role,
                content: msg.content,
            }));

        return { success: true, messages: orderedMessages };
    } catch (e) {
        console.error('Error retrieving conversation context', e);
        return { success: false, error: 'Failed to retrieve conversation history.' };
    }
};

// Get messages for a specific session
export const getSessionMessages = async (sessionId: string): Promise<{ success: boolean; messages?: Messages[]; error?: string }> => {
    try {
        await connectToDatabase();

        const messages = await ConversationMessage.find({ sessionId })
            .sort({ messageIndex: 1 })
            .lean();

        const formattedMessages: Messages[] = messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
        }));

        return { success: true, messages: formattedMessages };
    } catch (e) {
        console.error('Error retrieving session messages', e);
        return { success: false, error: 'Failed to retrieve session messages.' };
    }
};


