import { auth } from '@clerk/nextjs/server'
import Beams from '@/components/Beams'
import Hero from '@/components/Hero'
import Image from 'next/image'
import GradientBlinds from '@/components/GradientBlinds';
export default async function Page() {
  await auth()


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
    mouseDampening={1.15}
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
    </main>
  )
}