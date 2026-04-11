'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

const Hero = () => {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('signup') === 'true') {
      toast.info('Please sign up to access books')
    }
  }, [searchParams])

  return (
    <section className='glass w-full rounded-lg p-5 sm:p-6 md:p-8 '>

        <div className='flex flex-col gap-8 items-center justify-center text-center md:justify-start md:text-start lg:flex-row lg:items-start lg:justify-between'>

        <div className='left flex flex-col gap-6 lg:max-w-lg'>
            <div>
              <h1 className='font-classy text-3xl font-bold leading-tight tracking-[0.04em] sm:text-4xl lg:text-5xl'>
          Welcome to Bookie
        </h1>
        <p className='mt-3 text-sm font-mono opacity-75 sm:mt-4 sm:text-base md:text-lg'>
          What if books could talk? <br/>NOW they can !! with just 3 easy steps.
        </p>
            </div>
        <div>
           <Link href={'/books/new'}>
           <button className="group relative inline-flex h-[calc(48px+8px)] items-center justify-center rounded-full bg-neutral-950 py-1 pl-6 pr-14 font-medium text-neutral-50 transition-colors duration-300 hover:bg-[#8818bc2c] hover:text-black"><span className="z-10 pr-2 ">Get Started</span><div className="absolute right-1 inline-flex h-12 w-12 items-center justify-end rounded-full bg-[#6f0ba9] transition-[width] group-hover:w-[calc(100%-8px)] group-hover:bg-[#6b3dff]"><div className="mr-3.5 flex items-center justify-center"><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-50"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg></div></div>
           </button>
           </Link>
           
        </div>
        

        </div>

       
       

        <div className='ml-3 rounded-[10px] p-4 space-y-4 min-w-fit'>
          <div className='flex items-start gap-3'>
            <span className=' w-8 h-8 min-w-8 rounded-full border border-white/25 flex items-center justify-center text-base md:text-lg font-medium text-(--text-primary)'>
              1
            </span>
            <div>
              <p className='text-base sm:text-lg md:text-xl font-semibold leading-6 text-(--text-primary)'>Upload PDF</p>
              <p className='mt-1 text-xs sm:text-sm text-(--text-secondary)'>Add your book file</p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <span className='w-8 h-8 min-w-8 rounded-full border border-white/25 flex items-center justify-center text-base md:text-lg font-medium text-(--text-primary)'>
              2
            </span>
            <div>
              <p className='text-base sm:text-lg md:text-xl font-semibold leading-6 text-(--text-primary)'>AI Processing</p>
              <p className='mt-1 text-xs sm:text-sm text-(--text-secondary)'>We analyze the content</p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <span className='w-8 h-8 min-w-8 rounded-full border border-white/25 flex items-center justify-center text-base md:text-lg font-medium text-(--text-primary)'>
              3
            </span>
            <div>
              <p className='text-base sm:text-lg md:text-xl font-semibold leading-6 text-(--text-primary)'>Voice Chat</p>
              <p className='mt-1 text-xs sm:text-sm text-(--text-secondary)'>Discuss with AI</p>
            </div>
          </div>
        </div>

        </div>
        
      
        
    </section>
  )
}

export default Hero