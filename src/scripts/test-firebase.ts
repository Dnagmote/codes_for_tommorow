import { db, FieldValue } from '../config/firebase';

async function testFirebaseConnection(): Promise<void> {
  console.log('[Firebase Test] Testing Firebase Admin SDK and Firestore connection...');
  const testDocRef = db.collection('_health_check').doc('ping');

  try {
    const pingData = {
      status: 'healthy',
      timestamp: FieldValue.serverTimestamp(),
      testRunAt: new Date().toISOString(),
    };

    console.log('[Firebase Test] Writing temporary ping document to _health_check/ping...');
    await testDocRef.set(pingData);
    console.log('[Firebase Test] Temporary write verified.');

    console.log('[Firebase Test] Reading document back...');
    const snapshot = await testDocRef.get();
    if (!snapshot.exists) {
      throw new Error('Test document not found after write.');
    }
    const data = snapshot.data();
    if (data?.status !== 'healthy') {
      throw new Error(`Unexpected document content: ${JSON.stringify(data)}`);
    }
    console.log('[Firebase Test] Temporary read verified.');

    console.log('[Firebase Test] Cleaning up test document...');
    await testDocRef.delete();
    console.log('[Firebase Test] Temporary cleanup verified.');

    console.log('[Firebase Test] Firestore is fully operational.');
    process.exit(0);
  } catch (error: any) {
    console.error('[Firebase Test] Firebase connection failed:');
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    console.error(error.message || error);
    process.exit(1);
  }
}

void testFirebaseConnection();
