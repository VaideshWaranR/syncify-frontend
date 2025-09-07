'use client'
import React, { useEffect, useState } from 'react'
import UserInterface from './Components/userInterface'
import YouTubePlayer from './Components/YoutubePlayer'
import YouTubeSearch from './Components/YoutubeSearch'
const Page = () => {
  const [admin,setAdmin]=useState(false)
  useEffect(()=>{
  document.body.classList.add("dark")
  },[])
  return (
   <div className='flex flex-col justify-center items-center min-h-fit w-screen'>
   <UserInterface props={setAdmin}/>
   <YouTubePlayer props={admin}/>
   <YouTubeSearch />
   </div>
  )
}

export default Page