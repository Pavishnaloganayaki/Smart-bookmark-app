"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    // 1. Get User Session
    const getSession = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) fetchBookmarks()
    }
    getSession()

    // 2. REAL-TIME MAGIC: Listen for changes in the database
    const channel = supabase
      .channel('bookmarks_realtime_changes')
      .on('postgres_changes', { event: '*',  schema: 'public', table: 'bookmarks' }, () => {
        fetchBookmarks()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // 3. Fetch Bookmarks from Supabase
  const fetchBookmarks = async () => {
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setBookmarks(data)
  }

  // 4. Add a new Bookmark
  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title || !url) return // Added user check
    
    const { error } = await supabase
      .from('bookmarks')
      .insert([{ title, url, user_id: user.id }])
    
    if (!error) {
      setTitle(''); 
      setUrl(''); 
      fetchBookmarks(); // <--- ADD THIS LINE HERE
    } else {
      console.error("Error saving:", error.message)
    }
  }

  // 5. Delete a Bookmark
  const deleteBookmark = async (id: number) => {
    await supabase.from('bookmarks').delete().eq('id', id)
  }

  // LOGIN VIEW
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <h1 className="text-3xl font-bold mb-6">Smart Bookmark App</h1>
        <button 
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          className="bg-white border px-6 py-2 rounded-full shadow hover:shadow-md transition"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  // LOGGED IN VIEW
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-xl font-bold text-blue-600">My Bookmarks</h1>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-sm text-gray-500 hover:text-red-500">Logout</button>
      </div>

      {/* ADD FORM */}
      <form onSubmit={addBookmark} className="flex flex-col gap-3 mb-8 p-4 bg-gray-50 rounded-lg">
        <input 
          placeholder="Website Title" 
          value={title} onChange={(e) => setTitle(e.target.value)}
          className="p-2 border rounded" required 
        />
        <input 
          placeholder="URL (https://...)" 
          value={url} onChange={(e) => setUrl(e.target.value)}
          className="p-2 border rounded" required 
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Bookmark</button>
      </form>

      {/* LIST OF BOOKMARKS */}
      <div className="space-y-4">
        {bookmarks.length === 0 && <p className="text-center text-gray-400">No bookmarks yet. Add your first one!</p>}
        {bookmarks.map((bm) => (
          <div key={bm.id} className="flex justify-between items-center p-4 border rounded shadow-sm hover:border-blue-300">
            <div>
              <h3 className="font-semibold text-lg">{bm.title}</h3>
              <a href={bm.url} target="_blank" className="text-blue-500 text-sm hover:underline">{bm.url}</a>
            </div>
            <button onClick={() => deleteBookmark(bm.id)} className="text-red-400 hover:text-red-600 px-3">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}