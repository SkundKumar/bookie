'use client'

import React, { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Upload, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import LoadingOverlay from '@/components/LoadingOverlay'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DEFAULT_VOICE, voiceCategories, voiceOptions } from '@/lib/constants'
import { cn } from '@/lib/utils'

const MAX_PDF_SIZE = 50 * 1024 * 1024
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const VOICE_GROUP_LABELS = {
  male: 'Male Voices',
  female: 'Female Voices',
} as const

const formSchema = z.object({
  pdfFile: z
    .custom<File>((value) => value instanceof File, {
      message: 'Please upload a PDF file.',
    })
    .refine((file) => file.type === 'application/pdf', {
      message: 'Only PDF files are supported.',
    })
    .refine((file) => file.size <= MAX_PDF_SIZE, {
      message: 'PDF file size must be less than 50MB.',
    }),
  coverImage: z
    .custom<File | null>((value) => value === null || value instanceof File)
    .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, {
      message: 'Cover image size must be less than 10MB.',
    })
    .refine(
      (file) =>
        !file ||
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type),
      { message: 'Cover image must be a JPG, PNG, or WEBP file.' }
    )
    .nullable(),
  title: z.string().trim().min(1, 'Title is required.'),
  author: z.string().trim().min(1, 'Author name is required.'),
  voice: z.enum(['dave', 'daniel', 'chris', 'rachel', 'sarah']),
})

type UploadFormValues = z.infer<typeof formSchema>

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pdfFile: undefined as unknown as File,
      coverImage: null,
      title: '',
      author: '',
      voice: DEFAULT_VOICE,
    },
  })

  const openPdfPicker = () => {
    pdfInputRef.current?.click()
  }

  const openCoverPicker = () => {
    coverInputRef.current?.click()
  }

  const onSubmit = async (_values: UploadFormValues) => {
    setIsSubmitting(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    } finally {
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
                  <input
                    ref={pdfInputRef}
                    type='file'
                    accept='application/pdf'
                    className='sr-only'
                    id='pdf-upload'
                    onChange={(event) =>
                      field.onChange(event.target.files?.[0] ?? (undefined as unknown as File))
                    }
                  />
                </FormControl>
                <button
                  type='button'
                  className={cn(
                    'upload-dropzone border border-dashed !border-[#4b2a78]/45 glass-form !bg-transparent hover:!bg-[#4b2a78]/12',
                    field.value && 'upload-dropzone-uploaded !bg-[#4b2a78]/20'
                  )}
                  onClick={openPdfPicker}
                >
                  <Upload className='upload-dropzone-icon !text-[#8f67d496]' />
                  <p className='upload-dropzone-text !text-[#8f67d4cc]'>Click to upload PDF</p>
                  <p className='upload-dropzone-hint !text-[#8f67d496]'>PDF file (max 50MB)</p>
                </button>
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
                  <input
                    ref={coverInputRef}
                    type='file'
                    accept='image/jpeg,image/jpg,image/png,image/webp'
                    className='sr-only'
                    id='cover-upload'
                    onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                  />
                </FormControl>
                <button
                  type='button'
                  className={cn(
                    'upload-dropzone border border-dashed !border-[#4b2a78]/45 !bg-transparent glass-form hover:!bg-[#4b2a78]/12',
                    field.value && 'upload-dropzone-uploaded !bg-[#4b2a78]/20'
                  )}
                  onClick={openCoverPicker}
                >
                  <ImagePlus className='upload-dropzone-icon !text-[#8f67d496]' />
                  <p className='upload-dropzone-text !text-[#8f67d4cc]'>Click to upload cover image</p>
                  <p className='upload-dropzone-hint !text-[#8f7ab7]'>Leave empty to auto-generate from PDF</p>
                </button>
                {field.value && (
                  <div className='mt-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2'>
                    <p className='text-sm text-[var(--text-primary)] truncate pr-3'>
                      {field.value.name}
                    </p>
                    <button
                      type='button'
                      className='upload-dropzone-remove shrink-0'
                      onClick={() => {
                        field.onChange(null)
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
                    {Object.entries(voiceCategories).map(([category, keys]) => (
                      <div key={category} className='space-y-2'>
                        <p className='text-sm text-[var(--text-secondary)]'>
                          {VOICE_GROUP_LABELS[category as keyof typeof VOICE_GROUP_LABELS]}
                        </p>
                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                          {keys.map((voiceKey) => {
                            const option = voiceOptions[voiceKey as keyof typeof voiceOptions]
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