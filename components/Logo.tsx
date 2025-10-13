"use client";
import { Zap } from "lucide-react";
import {cn} from "@/lib/utils";
import React from "react";
import Link from "next/link";

export default function Logo({fontSize= "2xl", iconSize=20}:{fontSize?: string, iconSize?: number}){
 return(
  <Link href="/">
    <div className={cn("text-xl font-extrabold flex items-center gap-2", fontSize)}>
      
      <div className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-2">
        <Zap size={iconSize} className="stroke-white" />
      </div>
      <div>
        <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
          Zendllo
        </span>
      </div>
      
    </div>
  </Link>
 )
}