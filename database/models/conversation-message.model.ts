import { model, Schema, models } from "mongoose";
import { IConversationMessage } from "@/types";

const ConversationMessageSchema = new Schema<IConversationMessage>({
    clerkId: { type: String, required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'VoiceSession', required: true, index: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    // 'user' or 'assistant'
    role: { type: String, enum: ['user', 'assistant'], required: true },
    // The actual message content
    content: { type: String, required: true },
    // Track which message this was in the conversation (for ordering)
    messageIndex: { type: Number, required: true },
}, { timestamps: true });

// Index for fast retrieval of messages for a session, ordered by message index
ConversationMessageSchema.index({ sessionId: 1, messageIndex: 1 });
// Index for retrieving all messages for a user in a book
ConversationMessageSchema.index({ clerkId: 1, bookId: 1, createdAt: -1 });

const ConversationMessage = models.ConversationMessage || model<IConversationMessage>('ConversationMessage', ConversationMessageSchema);

export default ConversationMessage;
