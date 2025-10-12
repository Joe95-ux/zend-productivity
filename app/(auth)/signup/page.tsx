import Logo from '@/components/Logo'
import React from 'react'

const page = () => {
  return (
    <div className="flex justify-center gap-8 my-4 mx-auto">
        <div className="flex items-center justify-center flex-col gap-6">
            <div className=" flex flex-col gap-4">
                <Logo/>
                <h2 className="text-xl font-bold text-shadow-sky-100">Get Started with Us</h2>
                <p className="text-muted-foreground text-sm">Complete these easy steps to register your account</p>
            </div>
            <div className="flex flex-col gap-4">
                <div>Sign up your account</div>
                <div>Set up your workspave</div>
                <div>setup your profile</div>
            </div>
        </div>

    </div>
  )
}

export default page