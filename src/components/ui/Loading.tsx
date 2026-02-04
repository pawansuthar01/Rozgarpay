"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Loading({ h = null, message = "loading" }: any) {
  return (
    <div
      className={`flex flex-col justify-center items-center w-full ${
        h ? h : "h-screen"
      }   text-black`}
    >
      {/* Rotating Globe */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 9, ease: "linear" }}
        className="w-24 h-24 mb-6 relative"
      >
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin-slow" />
        <div className="absolute inset-0 rounded-full border-2 border-dotted border-sky-400 opacity-60" />
      </motion.div>

      {/* App Name */}
      <motion.h1
        className="text-3xl font-bold tracking-wide text-sky-400 drop-shadow-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        rozgarpay
      </motion.h1>

      {/* Loading Text */}
      <motion.p
        className="mt-2 text-sm text-black"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {message}...
      </motion.p>
    </div>
  );
}
