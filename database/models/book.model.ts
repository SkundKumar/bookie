import {model, Schema, models} from 'mongoose';
import {IBook} from '@/types';

//created a new schema named BookSchema with IBoook interface
const BookSchema = new Schema<IBook>({
    clerkId: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    author: { type: String, required: true },
    persona: { type: String },
    fileURL: { type: String, required: true },
    fileBlobKey: { type: String, required: true },
    coverURL: { type: String},
    coverBlobKey: { type: String },
    fileSize: { type: Number, required: true },
    totalSegments: { type: Number, default: 0 },
}, {timestamps: true});

// we export the model so that we can use it in other files, 
// if the model already exist we use it as it is other wise we create a new one using the schema
const Book = models.Book || model<IBook>('Book', BookSchema);

export default Book;