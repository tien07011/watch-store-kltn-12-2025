const { default: mongoose } = require("mongoose")

const dbConnect = async () => {
    try{
        // Use in-memory MongoDB during tests if no MONGODB_ATLAS_URL is provided
        if ((process.env.NODE_ENV === 'test' || !process.env.MONGODB_ATLAS_URL)) {
            // Lazy require to avoid adding this dependency in production
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();
            const conn = await mongoose.connect(uri);
            console.log("database connected successfully (in-memory)")
            // Keep reference so it doesn't get GC'd; attach to mongoose for potential cleanup
            mongoose.__MONGOD = mongod;
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_ATLAS_URL)
        console.log("database connected sccessfully")
    }catch(err){
        console.log("error connecting in db", err)
    }
}
module.exports = dbConnect;