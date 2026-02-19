"use client"
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false) // For the popup window

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) fetchBookmarks()
    }
    getSession()

    const channel = supabase
      .channel('bookmarks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks' }, () => {
        fetchBookmarks()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchBookmarks() {
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setBookmarks(data)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const { error } = await supabase
      .from('bookmarks')
      .insert([{ title, url, user_id: user.id }])

    if (!error) {
      setTitle(''); setUrl('');
      setIsModalOpen(false); // Close popup after adding
      fetchBookmarks();
    }
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)
    if (!error) fetchBookmarks()
  }

  const getRedirectURL = () => {
    return window.location.origin;
  };

  // 1. SIGN IN SCREEN (Same logic, better design)
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 px-4 font-sans">
        <h1 className="text-5xl font-black text-blue-600 mb-8 tracking-tighter">Smart Bookmark</h1>
        <button 
          onClick={() => supabase.auth.signInWithOAuth({ 
            provider: 'google', 
            options: { redirectTo: getRedirectURL() } 
          })}
          className="bg-white text-gray-800 px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all font-bold text-lg flex items-center gap-3 border border-gray-200"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  // 2. DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* --- HEADER SECTION --- */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative">
          
          {/* LEFT: New Bookmark Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            <span className="text-xl">+</span> New Bookmark
          </button>

          {/* CENTER: Title */}
          <h1 className="text-2xl font-black text-gray-800 absolute left-1/2 -translate-x-1/2">
            My Bookmarks
          </h1>

          {/* RIGHT: Logout */}
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            className="text-gray-400 font-semibold hover:text-red-500 transition text-sm uppercase tracking-wider"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        
        {/* --- THE GRID OF BOXES --- */}
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {bookmarks.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400 italic">
              No bookmarks yet. Click the + button to add your first one!
            </div>
          )}

          {bookmarks.map((bm) => (
            <div key={bm.id} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col justify-between group">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 truncate group-hover:text-blue-600 transition">
                  {bm.title}
                </h3>
                <a 
                  href={bm.url} target="_blank" rel="noreferrer" 
                  className="text-sm text-blue-500 hover:underline break-all"
                >
                  {bm.url}
                </a>
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={() => handleDelete(bm.id)}
                  className="text-gray-300 hover:text-red-500 text-xs font-bold uppercase transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- POPUP MODAL (The Hidden Window) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Save New Bookmark</h2>
            
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-gray-400 px-1">Name</label>
                <input 
                  placeholder="Website name" value={title} onChange={e => setTitle(e.target.value)} required 
                  className="p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-gray-400 px-1">URL Address</label>
                <input 
                  placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} required 
                  className="p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
                >
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

