"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface Transcript {
  id: string
  text: string
  filename: string
  createdAt: string
  updatedAt: string
}

interface TranscriptEditorProps {
  transcript: Transcript
}

export default function TranscriptEditor({ transcript }: TranscriptEditorProps) {
  const [text, setText] = useState(transcript.text)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length
  const charCount = text.length

  useEffect(() => {
    setIsDirty(text !== transcript.text)
    setSaveSuccess(false)
    setSaveError(null)
  }, [text, transcript.text])

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) {
        event.preventDefault()
        event.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch(`/api/transcript/${transcript.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Save failed with status ${response.status}`)
      }

      setSaveSuccess(true)
      setIsDirty(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }, [text, transcript.id])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault()
        if (isDirty && !isSaving) {
          handleSave()
        }
      }
    },
    [handleSave, isDirty, isSaving]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          {isDirty && <span className="text-amber-500 font-medium">Unsaved changes</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          Changes saved successfully
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 w-full p-4 border border-gray-300 rounded-md resize-none font-mono text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Transcript text will appear here..."
        aria-label="Transcript editor"
      />
    </div>
  )
}