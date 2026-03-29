import Link from 'next/link'
import React from 'react'
import { BookCardProps } from '@/types';
import Image from 'next/image';

{/*without defining the type here it would give a ts error and we can wither 
    define it here by {title,...,...,..}:{title:string, author:string}
    or we use interface like above and use it here for more readibility but whats better is 
    to keep it inside a new file called types.d.ts we can just import and 
    store every type in one place*/}
const BookCard = ({title, author, coverURL, slug}: BookCardProps) => {
  return (
    <Link href={`/books/${slug}`} className=''>
        <article className='book-card glass rounded-xl'>
            <figure className='book-card-figure'>
                <div className='book-card-cover-wrapper'>
                    <Image src={coverURL} alt={title} width={133} height={200} className='book-card-cover'>

                    </Image>
                </div>
            </figure>
            <figcaption className='flex flex-col text-center justify-between gap-3 '>
                <h3 className='book-card-title'>
                    {title}
                </h3>
                <h3 className='book-card-author'>
                    {author} 
                </h3>
            </figcaption>
        </article>
    </Link>
  )
}

export default BookCard 