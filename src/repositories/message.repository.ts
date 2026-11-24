import { db, FieldValue } from '../config/firebase';
import { firestorePaths } from '../constants/constants';
import type { FirestoreMessage } from '../types/firestore.types';
import type {
  MessageResponse,
  GetMessagesResult,
  CreateMessageData,
} from '../types/message.types';
import type { LatestMessagePreview } from '../types/user-chat.types';

export class MessageRepository {
  async createMessage(data: CreateMessageData): Promise<MessageResponse> {
    const { chatId, senderId, text } = data;
    const now = new Date();

    const collectionRef = db.collection(firestorePaths.chatMessagesCollection(chatId));
    const messageDocRef = collectionRef.doc();
    const messageId = messageDocRef.id;

    const firestoreData: Omit<FirestoreMessage, 'createdAt'> & { createdAt: any } = {
      id: messageId,
      chatId,
      senderId,
      text,
      createdAt: FieldValue.serverTimestamp(),
      isEdited: false,
      isDeleted: false,
    };

    await messageDocRef.set(firestoreData);

    return {
      id: messageId,
      chatId,
      senderId,
      text,
      createdAt: now.toISOString(),
      isEdited: false,
      isDeleted: false,
    };
  }

  async getMessages(
    chatId: string,
    limit: number,
    before?: string
  ): Promise<GetMessagesResult> {
    let query = db
      .collection(firestorePaths.chatMessagesCollection(chatId))
      .orderBy('createdAt', 'desc');

    if (before) {
      const parsedDate = new Date(before);
      if (!isNaN(parsedDate.getTime())) {
        query = query.startAfter(parsedDate);
      } else {
        const doc = await db
          .collection(firestorePaths.chatMessagesCollection(chatId))
          .doc(before)
          .get();
        if (doc.exists) {
          query = query.startAfter(doc);
        }
      }
    }

    // Fetch limit + 1 to check if there are more items
    query = query.limit(limit + 1);
    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limit;
    const targetDocs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    const messages: MessageResponse[] = targetDocs.map((doc) => {
      const d = doc.data() as FirestoreMessage;
      let createdAtIso = new Date().toISOString();
      if (d.createdAt && typeof (d.createdAt as any).toDate === 'function') {
        createdAtIso = (d.createdAt as any).toDate().toISOString();
      }

      let updatedAtIso: string | undefined = undefined;
      if (d.updatedAt && typeof (d.updatedAt as any).toDate === 'function') {
        updatedAtIso = (d.updatedAt as any).toDate().toISOString();
      }

      return {
        id: doc.id,
        chatId: d.chatId,
        senderId: d.senderId,
        text: d.text,
        createdAt: createdAtIso,
        updatedAt: updatedAtIso,
        isEdited: d.isEdited ?? false,
        isDeleted: d.isDeleted ?? false,
      };
    });

    // Reverse to chronological order (oldest to newest)
    messages.reverse();

    const lastDoc = targetDocs[targetDocs.length - 1];
    const nextCursor = hasMore && lastDoc ? lastDoc.id : undefined;

    return {
      messages,
      count: messages.length,
      limit,
      hasMore,
      nextCursor,
    };
  }

  async getMessageById(
    chatId: string,
    messageId: string
  ): Promise<MessageResponse | null> {
    const doc = await db
      .collection(firestorePaths.chatMessagesCollection(chatId))
      .doc(messageId)
      .get();

    if (!doc.exists) {
      return null;
    }

    const d = doc.data() as FirestoreMessage;
    let createdAtIso = new Date().toISOString();
    if (d.createdAt && typeof (d.createdAt as any).toDate === 'function') {
      createdAtIso = (d.createdAt as any).toDate().toISOString();
    }

    let updatedAtIso: string | undefined = undefined;
    if (d.updatedAt && typeof (d.updatedAt as any).toDate === 'function') {
      updatedAtIso = (d.updatedAt as any).toDate().toISOString();
    }

    return {
      id: doc.id,
      chatId: d.chatId,
      senderId: d.senderId,
      text: d.text,
      createdAt: createdAtIso,
      updatedAt: updatedAtIso,
      isEdited: d.isEdited ?? false,
      isDeleted: d.isDeleted ?? false,
    };
  }

  async getLatestMessage(chatId: string): Promise<LatestMessagePreview | null> {
    const snapshot = await db
      .collection(firestorePaths.chatMessagesCollection(chatId))
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty || snapshot.docs.length === 0) {
      return null;
    }

    const doc = snapshot.docs[0];
    if (!doc) {
      return null;
    }
    const data = doc.data() as FirestoreMessage;
    let createdAtIso = new Date().toISOString();
    if (data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
      createdAtIso = (data.createdAt as any).toDate().toISOString();
    }

    return {
      id: doc.id,
      senderId: data.senderId,
      text: data.text,
      createdAt: createdAtIso,
    };
  }

  async clearChatMessages(chatId: string): Promise<void> {
    const snapshot = await db
      .collection(firestorePaths.chatMessagesCollection(chatId))
      .get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export const messageRepository = new MessageRepository();
