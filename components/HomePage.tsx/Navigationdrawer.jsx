import { 
  Inbox, 
  Send, 
  AlertCircle, 
  Sparkles,
  LogOut

} from "lucide-react";

/**
 * @param {{ user: { name: string; email: string }; onSignOut: () => void; signOutError: string }} props
 */
export default function NavigationDrawer({ user, onSignOut, signOutError }) {


  return(
    <aside className="w-64 border-r border-slate-800 bg-black flex flex-col justify-between">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-6 px-2">
                <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-sm tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  MailFlow.ai
                </span>
              </div>
              
              <nav className="space-y-1">
                <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium rounded-md bg-slate-800 text-indigo-400">
                  <span className="flex items-center gap-2.5"><Inbox className="h-4 w-4" /> Inbox</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-black text-indigo-300 rounded font-bold">12</span>
                </button>
                <button className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-md text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors">
                  <Send className="h-4 w-4" /> Sent
                </button>
                <button className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-md text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors">
                  <AlertCircle className="h-4 w-4" /> Urgent Only
                </button>
              </nav>
            </div>
            
            <div className="p-4 border-t border-slate-800 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center text-xs font-bold text-slate-200">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate text-slate-300">{user.name}</span>
                <span className="text-[10px] text-slate-500 truncate">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="ml-auto rounded-md p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
            {signOutError && (
              <p role="alert" className="px-4 pb-3 text-[11px] text-rose-400">
                {signOutError}
              </p>
            )}
          </aside>
  )

}