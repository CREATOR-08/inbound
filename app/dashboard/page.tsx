'use client'
import { EmailThread } from '../../Types/email'
import React, { useState } from 'react'
import Navigationdrawer from '../../components/dashboard/Navigationdrawer'
import MiddlePane from '../../components/dashboard/MiddlePane'
import RightPane from '@/components/dashboard/RightPane'


// Types matching a production database schema

export default function DashboardPage () {
  const [selectedThreadId, setSelectedThreadId] = useState<string>('1')

  const [aiSidebarOpen, setAiSidebarOpen] = useState<boolean>(true)

  // Simulated live synchronized database records (from Prisma)
  const [threads] = useState<EmailThread[]>([
    {
      id: '1',
      sender: 'Alex Rivera (VP of Product)',
      subject: 'Urgent: Q3 Roadmap Alignment Strategy',
      preview:
        "We need to finalize the integration specs for the upcoming release before tomorrow morning's standup...",
      date: '10:42 AM',
      aiClassification: 'URGENT',
      summary:
        "Alex needs the technical integration specs for the Q3 release finalized before tomorrow morning's standup meeting."
    },
    {
      id: '2',
      sender: 'AWS Billing Support',
      subject: 'Production Environment Usage Invoice Alert',
      preview:
        'Your monthly billing statement is now available for review. Account ending in *9821 accrued charges...',
      date: 'Yesterday',
      aiClassification: 'ROUTINE',
      summary: 'Standard monthly AWS automated invoice announcement.'
    },
    {
      id: '3',
      sender: 'TLDR Newsletter',
      subject: 'AI Models Reach Next-Gen Context Windows',
      preview:
        'Major updates dropped this morning regarding LLMs handling over 2M tokens natively without performance degradation...',
      date: 'Jun 28',
      aiClassification: 'NEWSLETTER'
    }
  ])

  const activeThread = threads.find(t => t.id === selectedThreadId)

  return (
    <div className='flex h-screen w-screen bg-black text-slate-100 overflow-hidden font-sans'>
      {/* 1. LEFT PANE: Navigation Drawer */}
      <Navigationdrawer />

      {/* 2. MIDDLE PANE: Thread Explorer & Main Mail View */}

      <MiddlePane
        aiSidebarOpen={aiSidebarOpen}
        setAiSidebarOpen={setAiSidebarOpen}
        threads={threads}
        selectedThreadId={selectedThreadId}
        setSelectedThreadId={setSelectedThreadId}
      />

      {/* 3. RIGHT PANE: CopilotKit AI Sidebar Panel */}
      {aiSidebarOpen && (
        <RightPane/>
        
      )}
    </div>
  )
}
