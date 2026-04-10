import { model, Schema, models, Types } from "mongoose";
import { IBookSegment } from "@/types";

const BookSegmentSchema = new Schema<IBookSegment>({
    clerkId: { type: String, required: true },
    // book id comes from thebook schema above  
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    //the actual content 
    content: { type: String, required: true },
    //everything is divided into roughly 500 words segment
    segmentIndex: { type: Number, required: true, index: true },
    pageNumber: { type: Number, index: true, },
    wordCount: { type: Number, required: true },
}, { timestamps: true });
//this line we are indexing boh bookid and segment id and making sure its unique
//why unique? so as to stop duplication
//for eg if we are adding book id 24 and segment 23 and our app crashed and the person again try to add the book
//no now we are not gonna add bookid 24 and segment 23 again as it need to be unique thus removing duplication
// the 1 after that represent it will be stored in an assending order
BookSegmentSchema.index({ bookId: 1, segmentIndex: 1 }, { unique: true });
//here we are indexing bookid and page number so its easier to find the page no rather that going inside and finding it 
BookSegmentSchema.index({ bookId: 1, pageNumber: 1 });
// the most important one with book index we also index context which is text
//here we index the keywords for eg in a book we ask what are atomic function
// so now instead of searching everything we find the book id then we look for atomic and function keyword
//and in segments that we found both atomic and function we send it to our ai 
// this makes finding stuff faster as well as we are givingg a small ontext so it saves us on the cost and risk of hallucination.
// the database doesn't just store the text exactly as you typed it. It performs a background process called Text Analysis.
BookSegmentSchema.index({ bookId: 1, content: 'text' });

const BookSegment = models.BookSegment || model<IBookSegment>('BookSegment', BookSegmentSchema);

export default BookSegment;