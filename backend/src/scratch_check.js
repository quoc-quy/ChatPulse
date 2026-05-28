const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://quy:quy123@cluster0.ptzh2gl.mongodb.net/?appName=Cluster0`;

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('chatpulse-dev');
    
    console.log('--- LATEST 5 CALLS ---');
    const calls = await db.collection('calls').find().sort({ startedAt: -1, _id: -1 }).limit(5).toArray();
    console.log(calls);

    console.log('--- LATEST 5 CALL MESSAGES ---');
    const callMessages = await db.collection('messages').find({ type: 'call' }).sort({ createdAt: -1 }).limit(5).toArray();
    console.log(callMessages);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
