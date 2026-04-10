import mongoose from 'mongoose';

const getMongoUri = () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('Please define the MONGODB_URI environment variable');
    }
    return uri;
};
//declare a global variable to cache the connection so as to reduce duplication and imporve performance
declare global {
    //make a global variable mongoosecache
    var mongooseCache:{
        //has conn which is either a mongoose connection or nulll
        conn: typeof mongoose | null
        //promise which is a promise(it will return a mongoose connection in future) or null
        //we can also name it tryingToConnect instead of promise if it gets confusing to use promise one after another.
        promise: Promise<typeof mongoose> | null
    }
}
// making a local variable cache in which we are going to store cache connection
// so if it already exist so we are just going to put it as it is other wise we call the global and assign null to both. 
let cached = global.mongooseCache || (global.mongooseCache = {conn: null, promise:null});
//create an async function as we are going to use await for the connection and we are going to export it so that we can use it in other files.
export const connectToDatabase = async ()=>{
    const mongoUri = getMongoUri();
    //if in cache we find conn then we use it as it is
    if(cached.conn) return cached.conn;
    //or if we dont find a promise(its like if we see from a far that a connection is coming but in this case if we see nothing)
    // then we we are going to make a connection request and store it in a promise so we can wait for it to come and set the buffer to false as to not queue requests
    if(!cached.promise){
        cached.promise = mongoose.connect(mongoUri,{bufferCommands: false});
    }
    // we try to put the connection that we should get from the promise in the cached conn, if we get it good if not
    try {
        cached.conn = await cached.promise;
    } catch (error) {
        // we det the promise to null so as to try again and throw error
        cached.promise = null;
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
    console.info('Connected to MongoDB');
    return cached.conn;
}