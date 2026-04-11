import { auth } from '@clerk/nextjs/server'
import { getBookBySlug } from '@/lib/actions/book.actions'
import { ArrowLeft, Mic, MicOff } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import VapiControls from '@/components/VapiControls'
import Beams from '@/components/Beams'
type BookDetailsPageProps = {
  params: Promise<{ slug: string }>
}

const BookDetailsPage = async ({ params }: BookDetailsPageProps) => {
  const { userId } = await auth()

  if (!userId) {
    redirect('/?signup=true')
  }

  const { slug } = await params
  const bookResponse = await getBookBySlug(slug)

  if (!bookResponse.success || !bookResponse.data) {
    redirect('/')
  }

  const { title, author, coverURL, persona } = bookResponse.data

  return (
    <main className='relative min-h-screen w-full overflow-hidden'>
      {/* Background Beams */}
      <div className='absolute inset-0'>
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#FF9FFC"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>
      {/* Content */}
      <div className='relative z-10 book-page-container'>
        <Link
          href='/'
          className='back-btn-floating glass bg-[rgba(238,231,219,0.86)]! border-[#d8ccb7]/80!'
          aria-label='Go back'
        >
          <ArrowLeft className='h-5 w-5 text-[#6f3d28]' />
        </Link>
        <VapiControls book={bookResponse.data} />
      </div>
    </main>
  )
}

export default BookDetailsPage
