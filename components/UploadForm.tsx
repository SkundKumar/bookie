'use client'

import React, { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Upload, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {MAX_FILE_SIZE, ACCEPTED_PDF_TYPES, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE} from '@/lib/constants';
import LoadingOverlay from '@/components/LoadingOverlay'
import { toast } from "sonner"
import { Button } from '@/components/ui/button'
import { DEFAULT_VOICE, voiceCategories, voiceOptions } from '@/lib/constants'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn, parsePDFFile } from '@/lib/utils'
import { checkIfExist, createBook, saveSegment } from '@/lib/actions/book.actions'
import { useAuth } from "@clerk/nextjs"
import { useRouter } from 'next/navigation'

const VOICE_OPTIONS = {
  dave: {
    name: 'Dave',
    description: 'Young male, British-Essex, casual & conversational',
    group: 'Male Voices',
  },
  daniel: {
    name: 'Daniel',
    description: 'Middle-aged male, British, authoritative but warm',
    group: 'Male Voices',
  },
  chris: {
    name: 'Chris',
    description: 'Male, casual & easy-going',
    group: 'Male Voices',
  },
  rachel: {
    name: 'Rachel',
    description: 'Young female, American, calm & clear',
    group: 'Female Voices',
  },
  sarah: {
    name: 'Sarah',
    description: 'Young female, American, soft & approachable',
    group: 'Female Voices',
  },
} as const

const formSchema = z.object({
  pdfFile: z.instanceof(File, { message: "PDF file is required" })
        .refine((file) => file.size <= MAX_FILE_SIZE, "File size must be less than 50MB")
        .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), "Only PDF files are accepted"),
    coverImage: z.instanceof(File).optional()
        .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, "Image size must be less than 10MB")
        .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), "Only .jpg, .jpeg, .png and .webp formats are supported"),
  title: z.string().trim().min(1, 'Title is required.'),
  author: z.string().trim().min(1, 'Author name is required.'),
  voice: z.enum(['dave', 'daniel', 'chris', 'rachel', 'sarah']),
})

type UploadFormValues = z.infer<typeof formSchema>

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const { userId } = useAuth()
  const router = useRouter()

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      author: '',
      pdfFile: undefined,
      coverImage: undefined,
      voice: 'rachel',
    },
  })

  // Helper function to handle transparent S3 upload using the Presigned URL
  const uploadToS3 = async (file: File | Blob, filename: string, contentType: string) => {
    const res = await fetch('/api/s3-presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, contentType })
    });
    
    const { presignedUrl, publicUrl, key } = await res.json();
    if (!presignedUrl) throw new Error("Failed to get S3 presigned URL");

    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType }
    });

    if (!uploadRes.ok) throw new Error('Failed to upload file to S3');
    return { url: publicUrl, pathname: key };
  };

  const onSubmit = async (data: UploadFormValues) => {
    //here we check if the user exits or not by accesing the uerId from clerk
    if(!userId){
      toast.error("You must be logged in to upload a book.")
      return;
    }
    //if it does then we set the submitting to true
    setIsSubmitting(true)
    try {
      //we will check if th book alreaady exist or not by calling our server action, and we will send the title of the book 
      const bookExist = await checkIfExist(data.title);
      //if it exit we and we can access the sata we will tell them it exist and reroute them to the books page and reset form
      if(bookExist.exist && bookExist.data){
        toast.info("A book with this title already exists. Redirecting you to the book page...")
        form.reset();
        router.push(`/book/${bookExist.data.slug}`);
        return
      }

      //1. make the file name sent by user into a slug, why here when we did it in server action?
      //its because here we are not sending it to the mongodb we are going to store it somewhere else and need to make a slug for that and after we stroe it there we will store the where we stored and stuff to the mongodb
      const pdfName = data.title.replace(/\s+/g,'-').toLowerCase();
      //2. then we will access the js file object that contains all the info about our pdf as we cant just straight up send the pdf so we do it like this
      const pdf = data.pdfFile;
      // 3. then we pass it to the parsePdf Function in out utils to get the parsed and segmented pdf 
      const parsedPdf = await parsePDFFile(pdf);
      //4. if for some reason the lenth of the content is 0 that means we didnt parse so we tell them that and exit out of this
      if(parsedPdf.content.length === 0){
        toast.error("Failed to parse PDF file. Please make sure the file is a valid PDF and try again.")
        return;
      }
      
      // AWS S3 Update: Upload the PDF directly to AWS S3 using our presigned URL helper
      // The public URL and path (key) are returned identically to how Vercel Blob did it
      const uploadedPdf = await uploadToS3(pdf, `${pdfName}.pdf`, 'application/pdf');

      // we made a let variable to store the cover url as thery are in ifelse block
      // and as soon as we exit the block the data un uploadCover will be gone so we store it in a variable
      let coverUrl: string;
      // if the cover is provided by the user
      if(data.coverImage){
        // we access the file object of the cover image just like we did with the pdf
        const coverFile = data.coverImage;
        // Upload provided cover strictly to AWS S3
        const uploadCover = await uploadToS3(coverFile, `${pdfName}_cover.png`, coverFile.type);
        //after upload we save the uploadCover url 
        coverUrl = uploadCover.url;
      }else{
        // else we fetch the cover prom our parsedPdf as in our parse function in our util we are taking the first page of pdf and turning into a base64 text to make it the cover image
        const response = await fetch(parsedPdf.cover);
        // then using this we turn the base64 text to a file object
        const blob = await response.blob();
        // Upload auto-generated cover blob to AWS S3
        const uploadCover = await uploadToS3(blob, `${pdfName}_cover.png`, blob.type || 'image/png');
        coverUrl = uploadCover.url; 
      }

      //now that all that is done we are going to save the book data into mongo db using our server action fn we made earlier
      const book = await createBook({
      clerkId : userId,
      title: data.title,
      author: data.author,
      persona: data.voice,
      fileURL: uploadedPdf.url,
      // we are using blobkey as we cannot just use the url to delete the data from vercel if the user decide to delete it
      // we need the proper pathname
      fileBlobKey: uploadedPdf.pathname,
      coverURL: coverUrl,
      fileSize: pdf.size,
      })
      if(!book.success){
      throw new Error("Failed to create book in database.")
     }
      //after we ran the create book on book if the book exist we made the function return already exist field to be true and thats whay we are checking here

      if(book.alreadyExists){
       toast.info("A book with this title already exists. Redirecting you to the book page...")
        form.reset();
        router.push(`/book/${book.data.slug}`);
        return
      }
      //now else we create the segment
      const segmentUpload = await saveSegment(userId,book.data._id,parsedPdf.content);
      if(!segmentUpload.success){
         toast.error("Failed to save book segments. Please try again.")
        throw new Error("Failed to save book segments.")
      }
        form.reset();
        router.push('/');
      
    } catch (error) {
      //if not we throw errer and tell them to try again
      console.log('Error during book upload:', error)
      toast.error("An error occurred while uploading the book. Please try again.")
    } finally {
      // and regardless of success or faliure we set the submittting state to false 
      setIsSubmitting(false)
    }
  }

  return (
    <div className='new-book-wrapper'>
      {isSubmitting && <LoadingOverlay />}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='glass-form rounded-2xl border border-[var(--border-subtle)] p-6 sm:p-8 space-y-8'
        >
          <FormField
            control={form.control}
            name='pdfFile'
            render={({ field }) => (
              <FormItem className='space-y-3'>
                <FormLabel className='form-label !text-[var(--text-primary)]'>Book PDF File</FormLabel>
                <FormControl>
                  <div>
                    <input
                      ref={pdfInputRef}
                      type='file'
                      accept='application/pdf'
                      className='hidden'
                      id='pdf-upload'
                      onChange={(event) =>
                        field.onChange(event.target.files?.[0] ?? (undefined as unknown as File))
                      }
                    />
                    <label
                      htmlFor='pdf-upload'
                      className={cn(
                        'upload-dropzone border border-dashed !border-[#4b2a78]/45 glass-form !bg-transparent hover:!bg-[#4b2a78]/12',
                        field.value && 'upload-dropzone-uploaded !bg-[#4b2a78]/20'
                      )}
                    >
                      <Upload className='upload-dropzone-icon !text-[#8f67d496]' />
                      <p className='upload-dropzone-text !text-[#8f67d4cc]'>Click to upload PDF</p>
                      <p className='upload-dropzone-hint !text-[#8f67d496]'>PDF file (max 50MB)</p>
                    </label>
                    {field.value && (
                      <div className='mt-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2'>
                        <p className='text-sm text-[var(--text-primary)] truncate pr-3'>
                          {field.value.name}
                        </p>
                        <button
                          type='button'
                          className='upload-dropzone-remove shrink-0'
                          onClick={() => {
                            field.onChange(undefined as unknown as File)
                            if (pdfInputRef.current) {
                              pdfInputRef.current.value = ''
                            }
                          }}
                          aria-label='Remove PDF file'
                        >
                          <X className='size-4' />
                        </button>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='coverImage'
            render={({ field }) => (
              <FormItem className='space-y-3'>
                <FormLabel className='form-label !text-[var(--text-primary)]'>Cover Image (Optional)</FormLabel>
                <FormControl>
                  <div>
                    <input
                      ref={coverInputRef}
                      type='file'
                      accept='image/jpeg,image/jpg,image/png,image/webp'
                      className='hidden'
                      id='cover-upload'
                      onChange={(event) => field.onChange(event.target.files?.[0] ?? undefined)}
                    />
                    <label
                      htmlFor='cover-upload'
                      className={cn(
                        'upload-dropzone border border-dashed !border-[#4b2a78]/45 !bg-transparent glass-form hover:!bg-[#4b2a78]/12',
                        field.value && 'upload-dropzone-uploaded !bg-[#4b2a78]/20'
                      )}
                    >
                      <ImagePlus className='upload-dropzone-icon !text-[#8f67d496]' />
                      <p className='upload-dropzone-text !text-[#8f67d4cc]'>Click to upload cover image</p>
                      <p className='upload-dropzone-hint !text-[#8f7ab7]'>Leave empty to auto-generate from PDF</p>
                    </label>
                    {field.value && (
                      <div className='mt-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2'>
                        <p className='text-sm text-[var(--text-primary)] truncate pr-3'>
                          {field.value.name}
                        </p>
                        <button
                          type='button'
                          className='upload-dropzone-remove shrink-0'
                          onClick={() => {
                            field.onChange(undefined)
                            if (coverInputRef.current) {
                              coverInputRef.current.value = ''
                            }
                          }}
                          aria-label='Remove cover image'
                        >
                          <X className='size-4' />
                        </button>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='form-label !text-[var(--text-primary)]'>Title</FormLabel>
                <FormControl>
                  <input
                    className='form-input glass-form !bg-transparent !text-[var(--text-primary)] placeholder:!text-[var(--text-muted)] border border-[var(--border-subtle)]'
                    placeholder='ex: Rich Dad Poor Dad'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='author'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='form-label !text-[var(--text-primary)]'>Author Name</FormLabel>
                <FormControl>
                  <input
                    className='form-input glass-form !bg-transparent !text-[var(--text-primary)] placeholder:!text-[var(--text-muted)] border border-[var(--border-subtle)]'
                    placeholder='ex: Robert Kiyosaki'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='voice'
            render={({ field }) => (
              <FormItem className='space-y-4'>
                <FormLabel className='form-label !text-[var(--text-primary)]'>Choose Assistant Voice</FormLabel>
                <FormControl>
                  <div className='space-y-4'>
                    {['Male Voices', 'Female Voices'].map((groupName) => (
                      <div key={groupName} className='space-y-2'>
                        <p className='text-sm text-[var(--text-secondary)]'>{groupName}</p>
                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                          {Object.entries(VOICE_OPTIONS)
                            .filter(([, option]) => option.group === groupName)
                            .map(([voiceKey, option]) => {
                              const isSelected = field.value === voiceKey

                              return (
                                <button
                                  key={voiceKey}
                                  type='button'
                                  onClick={() => field.onChange(voiceKey)}
                                  className={cn(
                                    'voice-selector-option flex-col items-start text-left glass-form !bg-transparent hover:!bg-[#4b2a78]/5',
                                    isSelected
                                      ? 'voice-selector-option-selected border !border-[#4b2a78] !bg-[#4b2a78]/25'
                                      : 'voice-selector-option-default'
                                  )}
                                >
                                  <span className='text-base font-semibold text-[var(--text-primary)]'>
                                    {option.name}
                                  </span>
                                  <span className='text-xs text-[var(--text-secondary)] leading-relaxed'>
                                    {option.description}
                                  </span>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type='submit'
            className='form-btn glass-form !bg-transparent !text-[#f4f4f4e5] border border-[#4b2a78]/70 hover:!bg-[#4b2a78]/20'
            disabled={isSubmitting}
          >
            Begin Synthesis
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default UploadForm