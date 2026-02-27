import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Plus, MessageSquare } from 'lucide-react'
import { formatDateTime } from '../utils/date'

export default function OrderNotes({ orderId, onNoteAdded }) {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [orderId])

  const fetchNotes = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`)
      if (response.data.order.notes) {
        const parsedNotes = typeof response.data.order.notes === 'string' 
          ? JSON.parse(response.data.order.notes)
          : response.data.order.notes
        setNotes(parsedNotes)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setLoading(true)
    try {
      await api.post(`/orders/${orderId}/notes`, { note: newNote })
      setNewNote('')
      fetchNotes()
      onNoteAdded?.()
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Failed to add note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary-600" />
        <h3 className="font-bold text-gray-800">Order Notes</h3>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-2"
          rows="3"
        />
        <button
          type="submit"
          disabled={loading || !newNote.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </form>

      {/* Notes List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No notes yet</p>
        ) : (
          notes.map((note, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-800">{note.admin_name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{formatDateTime(note.created_at)}</p>
              </div>
              <p className="text-sm text-gray-600">{note.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

