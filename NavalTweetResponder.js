import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Settings } from "lucide-react"

export default function NavalTweetResponder() {
  const [generatedTweet, setGeneratedTweet] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "displayResponse") {
        setGeneratedTweet(request.response)
        setIsLoading(false)
      } else if (request.action === "error") {
        setError(request.message)
        setIsLoading(false)
      }
    })
  }, [])

  const handleGenerateTweet = async () => {
    setIsLoading(true)
    setError("")
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "getTweet" })
    })
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedTweet)
  }

  return (
    <div className="naval-tweet-responder">
      <h2>Naval Tweet Responder</h2>
      <button onClick={handleGenerateTweet} disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Tweet"}
      </button>
      <textarea
        value={generatedTweet}
        readOnly
        placeholder="Generated tweet will appear here..."
      />
      <button onClick={handleCopyToClipboard} disabled={!generatedTweet}>
        Copy to Clipboard
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}