'use client'

import { useState } from 'react'
import { NavBar } from '@/components/NavBar'
import { V1 } from '@/components/versions/V1'
import { V2 } from '@/components/versions/V2'

type Tab = 'v1' | 'v2'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('v1')

  return (
    <div className="flex flex-col h-screen">
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'v1' ? <V1 /> : <V2 />}
      </div>
    </div>
  )
}
