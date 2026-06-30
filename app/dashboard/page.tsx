'use client'

import { EmailThread } from '../../Types/email'
import React, { useState } from 'react'
import Navigationdrawer from '../../components/dashboard/Navigationdrawer'
import MiddlePane from '../../components/dashboard/MiddlePane'
import RightPane from '@/components/dashboard/RightPane'
import { Menu } from 'lucide-react' // Added for a mobile sidebar toggle fallback

export default function DashboardPage () {
  const [selectedThreadId, setSelectedThreadId] = useState<string>('1')
  const [aiSidebarOpen, setAiSidebarOpen] = useState<boolean>(false) // Default closed on smaller viewports
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(false) // Track mobile navigation state

  const [threads] = useState<EmailThread[]>([
    {
      id: '1',
      sender: 'Alex Rivera (VP of Product)',
      subject: 'Urgent: Q3 Roadmap Alignment Strategy',
      preview: "We need to finalize the integration specs for the upcoming release before tomorrow morning's standup...",
      date: '10:42 AM',
      aiClassification: 'URGENT',
      summary: "Alex needs the technical integration specs for the Q3 release finalized before tomorrow morning's standup meeting."
    },
    {
      id: '2',
      sender: 'AWS Billing Support',
      subject: 'Production Environment Usage Invoice Alert',
      preview: 'Your monthly billing statement is now available for review. Account ending in *9821 accrued charges...',
      date: 'Yesterday',
      aiClassification: 'ROUTINE',
      summary: 'Standard monthly AWS automated invoice announcement.'
    },
    {
      id: '3',
      sender: 'TLDR Newsletter',
      subject: 'AI Models Reach Next-Gen Context Windows',
      preview: 'Major updates dropped this morning regarding LLMs handling over 2M tokens natively without performance degradation...',
      date: 'Jun 28',
      aiClassification: 'NEWSLETTER'
    }
  ])

  return (
    <div className='flex h-screen w-screen bg-black text-slate-100 overflow-hidden font-sans relative'>
      
      {/* 1. MOBILE MENU BACKGROUND OVERLAYS */}
      {leftSidebarOpen && (
        <div onClick={() => setLeftSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
      )}
      {aiSidebarOpen && (
        <div onClick={() => setAiSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 xl:hidden" />
      )}

      {/* 2. LEFT PANE: Navigation Drawer */}
      {/* On mobile, it slides out from the left. On lg screens, it sits statically inline */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0`}>
        <Navigationdrawer />
      </div>

      {/* 3. MIDDLE PANE: Thread Explorer & Main Mail View */}
      {/* We inject a mobile trigger hook button down into the MiddlePane so mobile users can open the nav menu */}
      <MiddlePane
        aiSidebarOpen={aiSidebarOpen}
        setAiSidebarOpen={setAiSidebarOpen}
        threads={threads}
        selectedThreadId={selectedThreadId}
        setSelectedThreadId={setSelectedThreadId}
        onMobileMenuToggle={() => setLeftSidebarOpen(true)} 
      />

      {/* 4. RIGHT PANE: AI Panel */}
      {/* On smaller screens, it floats over content. On xl screens, it nests inside the standard flex alignment flow */}
      {aiSidebarOpen && (
        <div className="fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out xl:relative xl:translate-x-0">
          <RightPane setAiSidebarOpen={setAiSidebarOpen} />
        </div>
      )}
    </div>
  )
}