import { db, FieldValue } from '../config/firebase';
import { firestorePaths } from '../constants/constants';
import type { ReadReceiptResponse } from '../types/read-receipt.types';

export class ReadReceiptRepository {
  async markAsRead(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<ReadReceiptResponse> {
    const docPath = firestorePaths.messageReadDoc(chatId, messageId, userId);
    const readDocRef = db.doc(docPath);
    const now = new Date();

    await readDocRef.set(
      {
        userId,
        readAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      chatId,
      messageId,
      userId,
      readAt: now.toISOString(),
    };
  }

  async getReadReceipt(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<ReadReceiptResponse | null> {
    const docPath = firestorePaths.messageReadDoc(chatId, messageId, userId);
    const doc = await db.doc(docPath).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    let readAtIso = new Date().toISOString();
    if (data?.readAt && typeof (data.readAt as any).toDate === 'function') {
      readAtIso = (data.readAt as any).toDate().toISOString();
    }

    return {
      chatId,
      messageId,
      userId: data?.userId || userId,
      readAt: readAtIso,
    };
  }
}

export const readReceiptRepository = new ReadReceiptRepository();
