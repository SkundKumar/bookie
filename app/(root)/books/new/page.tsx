import UploadForm from '@/components/UploadForm'
import React from 'react'

const page = () => {
  return (
    <main className='wrapper container'>
        <div className='mx-auto max-w-180 spacy-y-10'>
            <section className='flex flex-col gap-5'>
                <h1 className='page-title-xl !text-white'>Add A New Book</h1>
                <p className='subtitle'> Upload a pdf to turn it into a magical book</p>
            </section>
            <UploadForm/>
        </div>
    </main>
  )
}

export default page