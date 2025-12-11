import { useConversation } from '../../../providers/conversation-provider'

export default function ConversationList() {
  const {
    conversations,
    activeConversationId,
    isLoadingConversations,
    loadConversation,
    createNewConversation,
    refreshConversationList
  } = useConversation()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={createNewConversation}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="p-4 text-center text-gray-500">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No conversations yet</div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.uuid}
                onClick={() => loadConversation(conv.uuid)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeConversationId === conv.uuid
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="font-medium text-sm truncate">{conv.name || 'Untitled Chat'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(conv.updated_at)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={refreshConversationList}
          disabled={isLoadingConversations}
          className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm disabled:opacity-50"
        >
          {isLoadingConversations ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
