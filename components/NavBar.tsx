'use client'

import { motion } from 'framer-motion'
import { SPRING_SOFT } from '@/lib/motion'

type Tab = 'v1' | 'v2'

interface NavBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  return (
    <nav className="w-full">
      <div className="flex items-center gap-1 px-4 mx-auto w-fit">
        <motion.button
          onClick={() => onTabChange('v1')}
          className={`relative px-6 py-2 text-sm font-medium rounded-full transition-colors ${
            activeTab === 'v1'
              ? 'text-neutral-900 bg-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_SOFT}
        >
          V1
          {activeTab === 'v1' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-neutral-100 rounded-full -z-10"
              transition={SPRING_SOFT}
            />
          )}
        </motion.button>
        <motion.button
          onClick={() => onTabChange('v2')}
          className={`relative px-6 py-2 text-sm font-medium rounded-full transition-colors ${
            activeTab === 'v2'
              ? 'text-neutral-900 bg-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_SOFT}
        >
          V2
          {activeTab === 'v2' && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-neutral-100 rounded-full -z-10"
              transition={SPRING_SOFT}
            />
          )}
        </motion.button>
      </div>
    </nav>
  )
}

