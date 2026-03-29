'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

const navItems = [
    {label:"Library", href:"/"},
    {label:"Add New", href:"/books/new"},

]
const Navbar = () => {
    const pathName = usePathname();
    //destructuring the user to get the first name last name etc and we used it below.
    const { user } = useUser();
  return (
    <header className='w-full fixed z-50 bg-(`--bg-primary`)'>
        
        <div className='wrapper navbar-height py-4 flex justify-between items-center'>
            <Link href={"/"} className='flex gap-0.5 items-center text-md font-classy'>Bookie</Link>
        <nav className='w-fit flex gap-7.5 items-center'>
            {navItems.map(({label, href})=>{
                const isActive = pathName === href || (href !== '/' && pathName.startsWith(href));
                return(
                /* 
                usePathname Hook:
                    it helps us set the dynamic navbar feature, so we set isactive 
                    if pathname = href so it check the href we assigned to the link and the
                    actual pathname if it matches it will give true and thats how we used pathname     
                */
                    <Link className={cn('hidden md:inline-flex nav-link-base font-classy',isActive?'nav-link-active':'text-white ')} href={href} key={label}>
                        {label}
                    </Link>
                )
            })}
            <Show when='signed-out'>
                <SignInButton />
                <SignUpButton />
            </Show>
            <Show when='signed-in'>
                <div className='nav-user-link'>
                    <UserButton />
                    {/*
                    first we checked if the user exists we read the 
                    firstname(thats why user?.firstname)
                     and then we dispayed it below.
                    */}
                    {user?.firstName && (
                        <Link href={'/subscriptions'} className=' font-classy text-sm nav-user-name'>
                            {user.firstName}
                        </Link>
                    )}
                </div>
            </Show>
        </nav>
        

        </div>
    </header>
  )
}

export default Navbar