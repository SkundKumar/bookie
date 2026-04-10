'use server'
import { CreateBook, TextSegment } from "@/types";
import { connectToDatabase } from "@/database/mongoose";
import { generateSlug } from "../utils";
import Book from "@/database/models/book.model";
import { serializeData } from "../utils";
import { success } from "zod";
import BookSegment from "@/database/models/book-segment.model";
import { connect } from "http2";

export const BookFetch = async()=>{
    try {
    await connectToDatabase();
    const books = await Book.find().sort({createdAt: -1}).lean();
       return{
        success: true,
        data: serializeData(books),
       } 
    } catch (error) {
        console.error('Error fetching book:', error);
        return{
            success: false,
            error: error,
        }
    }
}
export const checkIfExist = async(title: string, )=>{
    try {
        await connectToDatabase();
        //crazy part here is if instead of const slug i wrote const slur i would have to write full on {slug:slur} in findOne
        //but as my variable name is same as thekey in the db i can just write {slug} and it will be fine
        const slug = generateSlug(title);
        const existBook = await Book.findOne({slug}).lean();
        if(existBook){
            return{
                exist:true,
                data: serializeData(existBook)
            }
        }else{
            return{
                exist: false,
            }
        }
    } catch (error) {
        console.error('Error checking book existence:', error);
        return{
            exist: false,
            error: error,
        }
    }
}
// function that will create a new book in the database
export const createBook = async (data: CreateBook)=>{
    try{
        //connection to the db 
        await connectToDatabase();
        //here we are using a util function to turn the title of the bok into a slug
        const slug  = generateSlug(data.title);
        // as it will take time we have await,
        // findOne is a mongoose function that find and stop the second it find one.
        // we use .lean as we are just checking if it exist or not so we need nothing more so we use lean. it comes from monoose as well. 
        const existingBook = await Book.findOne({slug}).lean();
        if(existingBook){
            return {
                success:true,
                // data: existingBook,
                //we cannot pass it like this, we need to serialise the dat.
                // so we  need to stringify it then parse it, we need to do when we pass big data from server action back to frontend.
                //data: JSON.parse(JSON.stringify(existingBook)),
                //but insted of this we use a util function.
                // mongoose obj -> json obj (removes object id,date,...)
                data: serializeData(existingBook),
                alreadyExists: true, 
            }
        }

        //if it dont exist
        // we create a newBook using the create fn by mongoose,
        // we ofc apply it on Book a model we defined before and to that we attach the datta slug and initially we set the total segments to 0;
        const newBook = await Book.create({...data,slug,totalSegments: 0})
        return{
            success: true,
            // here we are returning the serialised version of our newBook.
            // now we didi the same above when we found the existing data dont get confused due to the naming.
            data: serializeData(newBook),
        }

    }catch(e){
        console.error('Error creating book:', e);
        return {success: false, error: e }
    }
}
//save segment
export const saveSegment = async(clerkId: string, bookId: string, segments: TextSegment[])=>{
    try {
        //connect to db
        await connectToDatabase();

        console.log("Saving Segments");
        //here we made segment data and inside segment we mapped the segments and we added that segment but with that we also added clerkid bookid and set the content to text
        //why? becausee tthats how we defined the out=r BookSegment model
        // so we map over the segments add dtheir data and also add our own data and thus form the segmentedData that is rady to be inserted into the db
        const segmentedData = segments.map(({text, segmentIndex, wordCount, pageNumber})=>({
            clerkId, bookId, content: text, segmentIndex, wordCount, pageNumber
        }));

        // we insert all of them all at once and use the model BookSegment so its int he same schemea 
        await BookSegment.insertMany(segmentedData);
        // then we update the totalsegment data that we left zero above to the actual segment count
        await Book.findByIdAndUpdate(bookId, {totalSegments: segments.length});
         console.log('Segments saved successfully!');
        return{
            success: true,
            data: {SegmentCreated: segments.length}
        }
       

    } catch (error) {
        console.error('Error saving segments:', error);

        await BookSegment.deleteMany({bookId});
        await Book.findByIdAndDelete(bookId);
        console.log('deleted succesfully, you can try again!')
        return{
            success: false,
            error: error,
        }
    }
}

export const getBookBySlug = async (slug: string) => {
    try {
        await connectToDatabase();

        const book = await Book.findOne({ slug }).lean();
        if (!book) {
            return {
                success: false,
                data: null,
            };
        }

        return {
            success: true,
            data: serializeData(book),
        };
    } catch (error) {
        console.error('Error fetching book by slug:', error);
        return {
            success: false,
            data: null,
            error,
        };
    }
}