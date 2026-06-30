import {
  Sparkles,
  ChevronRight,

  FileText
} from 'lucide-react'

export default function RightPane(){
  return(
    <aside className='w-80 border-l border-slate-800 bg-black backdrop-blur-sm flex flex-col min-w-0'>
          <div className='p-4 border-b border-slate-800 flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-indigo-400 animate-pulse' />
            <h3 className='text-xs font-semibold text-slate-200 tracking-wide uppercase'>
              Agent Workspace
            </h3>
          </div>

          <div className='flex-1 p-4 overflow-y-auto space-y-4'>
            <div className='space-y-2'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Suggested Automations
              </label>
              <div className='p-3 bg-black border border-slate-800 hover:border-indigo-900/50 rounded-xl cursor-pointer transition-all space-y-1'>
                <div className='flex items-center gap-1.5 text-xs font-medium text-slate-200'>
                  <FileText className='h-3.5 w-3.5 text-indigo-400' />
                  Draft Action Plan
                </div>
                <p className='text-[10px] text-slate-400'>
                  Generate structured response options matching Alex's calendar
                  openings.
                </p>
              </div>
            </div>

            {/* This mimics the layout of a streamed CopilotKit UI message block */}
            <div className='space-y-2 pt-2'>
              <label className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                Copilot Conversation
              </label>
              <div className='bg-black rounded-xl p-3 border border-slate-800/80 space-y-3'>
                <div className='space-y-1'>
                  <span className='text-[10px] font-bold text-indigo-400'>
                    Copilot Agent
                  </span>
                  <p className='text-xs text-slate-300 leading-relaxed'>
                    I scanned the database for updates regarding the roadmap.
                    Should I draft a response scheduling a sync at 2 PM?
                  </p>
                </div>
                <div className='flex gap-2 pt-1'>
                  <button className='flex-1 py-1 px-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-medium rounded-md hover:bg-indigo-600/30 transition-colors'>
                    Approve Draft
                  </button>
                  <button className='flex-1 py-1 px-2 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium rounded-md hover:bg-slate-700 transition-colors'>
                    Modify Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className='p-3 border-t border-slate-800 bg-black'>
            <div className='flex items-center bg-black border border-slate-800 rounded-lg px-2.5 py-1.5 focus-within:border-slate-700 transition-colors'>
              <input
                type='text'
                placeholder='Ask Copilot to execute context tasks...'
                className='w-full bg-transparent text-xs border-0 focus:outline-none text-slate-200 placeholder-slate-500'
              />
              <ChevronRight className='h-4 w-4 text-slate-500 cursor-pointer' />
            </div>
          </div>
        </aside>
  )
}