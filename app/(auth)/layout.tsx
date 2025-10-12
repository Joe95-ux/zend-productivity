import React from "react";
import Logo from "@/components/Logo";

const layout = ({children}: {children: React.ReactNode})=>{
    return(
        <div className="h-full flex flex-col py-4 justify-center items-center gap-4">
            <Logo/>
            {children}
        </div>
    )

}

export default layout;