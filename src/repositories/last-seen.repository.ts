import { db, FieldValue } from '../config/firebase';
import { firestorePaths } from '../constants/constants';
import type { LastSeenResponse } from '../types/last-seen.types';

export class LastSeenRepository {
  async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string
  ): Promise<LastSeenResponse> {
    const docPath = firestorePaths.chatLastSeenDoc(chatId, userId);
    const docRef = db.doc(docPath);
    const now = new Date();

    await docRef.set(
      {
        userId,
        messageId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      chatId,
      userId,
      lastSeenMessageId: messageId,
      updatedAt: now.toISOString(),
    };
  }

  async getLastSeen(
    chatId: string,
    userId: string
  ): Promise<LastSeenResponse | null> {
    const docPath = firestorePaths.chatLastSeenDoc(chatId, userId);
    const doc = await db.doc(docPath).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    let updatedAtIso = new Date().toISOString();
    if (data?.updatedAt && typeof (data.updatedAt as any).toDate === 'function') {
      updatedAtIso = (data.updatedAt as any).toDate().toISOString();
    }

    return {
      chatId,
      userId: data?.userId || userId,
      lastSeenMessageId: data?.messageId || '',
      updatedAt: updatedAtIso,
    };
  }
}

export const lastSeenRepository = new LastSeenRepository();
