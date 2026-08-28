import { MongoClient } from 'mongodb';

const oldUri = 'mongodb+srv://admin:admin@cluster0.zth1by3.mongodb.net/taj?retryWrites=true&w=majority';
const newUri = 'mongodb+srv://shineinfosolutions1_db_user:8wlEcSMIAI8ONjJO@cluster0.lbbt07v.mongodb.net/taj?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  const oldClient = new MongoClient(oldUri);
  const newClient = new MongoClient(newUri);

  try {
    await oldClient.connect();
    await newClient.connect();
    
    console.log('Connected to both databases.');
    
    const oldDb = oldClient.db();
    const newDb = newClient.db();
    
    const collections = await oldDb.listCollections().toArray();
    
    for (let collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      // Skip system collections
      if (collectionName.startsWith('system.')) continue;

      console.log(`Migrating collection: ${collectionName}`);
      
      const oldCollection = oldDb.collection(collectionName);
      const newCollection = newDb.collection(collectionName);
      
      // Clear new collection first to prevent duplicates
      await newCollection.deleteMany({});
      
      const documents = await oldCollection.find({}).toArray();
      
      if (documents.length > 0) {
        await newCollection.insertMany(documents);
        console.log(`  -> Inserted ${documents.length} documents.`);
      } else {
        console.log(`  -> Collection is empty.`);
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrate();
