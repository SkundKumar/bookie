import { auth } from '@clerk/nextjs/server'
import Beams from '@/components/Beams'
import Hero from '@/components/Hero'
import Image from 'next/image'
import GradientBlinds from '@/components/GradientBlinds';
import BookCard from '@/components/BookCard';
import { sampleBooks } from '@/lib/constants';
import { BookFetch } from '@/lib/actions/book.actions';
export default async function Page() {
  await auth()
  const bookresponse = await BookFetch();
  // the ?? is a nullish coalescing operator that will return the value on the right if the value on the left is null or undefined.
  //  so if bookresponse.data is null or undefined it will return an empty array instead of throwing an error when we try to map over it in the BookCard component. this way we can avoid the error and still render the page with an empty library section. if bookresponse.success is false then we also return an empty array as we dont have any data to show.
  const books = bookresponse.success? bookresponse.data ?? [] : [];

  return (
    <main className='relative min-h-screen w-full overflow-hidden'>
      <div className='absolute inset-0'>
        


  <GradientBlinds
    gradientColors={['#FF9FFC', '#5227FF']}
    angle={0}
    noise={0.2}
    blindCount={27}
    blindMinWidth={25}
    spotlightRadius={0.5}
    spotlightSoftness={1}
    spotlightOpacity={0.7}
    mouseDampening={0.25}
    distortAmount={0}
    shineDirection="left"
    mixBlendMode="lighten"
  />

      </div>
      

      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40'>
          <div className='w-full'>
            <Hero />
          </div>
      </div>
      <div className='library-books-grid mt-10'>
          {books.map((book)=>{
            {/*slug is usually a URL-friendly identifier for a resource — 
              in this case, each book. Instead of using the raw database id or
               title (which might have spaces/special characters), you store a lowercase,
                hyphenated string like the-alchemist or harry-potter-1. That lets you 
                build clean routes such as /books/the-alchemist, fetch the right book on the server,
                 and display it via book.slug. So passing slug={book.slug} to BookCard means the card can 
                 link to or otherwise reference the specific book’s detail page without hardcoding the URL every time.
              */}
            return <BookCard key={book._id} title={book.title} author={book.author} coverURL ={book.coverURL} slug={book.slug}/>
          })}
        </div>
    </main>
  )
}