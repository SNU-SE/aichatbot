import { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useChatHistory } from '../../hooks/useChat';
import { useCurrentStudent } from '../../hooks/useStudents';
import { supabase } from '../../lib/supabase';
import { useRealtimeChat } from '../../hooks/useRealtime';
import { useNotifications } from '../common/NotificationSystem';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  isStreaming?: boolean;
}

interface StreamingChatInterfaceProps {
  activityId?: string;
  className?: string;
}

export default function StreamingChatInterface({ activityId, className }: StreamingChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { data: student } = useCurrentStudent();
  const { data: chatHistory, isLoading: historyLoading } = useChatHistory(
    student?.id || '', 
    activityId
  );

  // 채팅 기록을 메시지 형태로 변환
  useEffect(() => {
    if (chatHistory) {
      const convertedMessages: ChatMessage[] = [];
      chatHistory.forEach((chat) => {
        // 사용자 메시지
        convertedMessages.push({
          id: `${chat.id}-user`,
          content: chat.message,
          isUser: true,
          timestamp: chat.created_at,
        });
        // AI 응답
        convertedMessages.push({
          id: `${chat.id}-ai`,
          content: chat.response,
          isUser: false,
          timestamp: chat.created_at,
        });
      });
      setMessages(convertedMessages);
    }
  }, [chatHistory]);

  // 메시지 목록 끝으로 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !student || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: message,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    // 사용자 메시지를 즉시 표시
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage('');
    setIsLoading(true);

    // AI 응답 스트리밍 메시지 추가
    const streamingMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      content: '',
      isUser: false,
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, streamingMessage]);

    try {
      // AbortController for cancelling requests
      abortControllerRef.current = new AbortController();

      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          message: currentMessage,
          studentId: student.id,
          activityId,
          useRag,
          stream: false, // 일단 non-streaming으로 구현
        },
        signal: abortControllerRef.current.signal,
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI 응답 생성 중 오류가 발생했습니다.');
      }

      // 스트리밍 메시지를 실제 응답으로 업데이트
      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingMessage.id 
            ? { ...msg, content: response.data.response, isStreaming: false }
            : msg
        )
      );

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // 에러 메시지로 업데이트
      const errorMessage = error.name === 'AbortError' 
        ? '메시지 전송이 취소되었습니다.'
        : '죄송합니다. 메시지 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingMessage.id 
            ? { ...msg, content: errorMessage, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    if (window.confirm('채팅 기록을 모두 지우시겠습니까?')) {
      setMessages([]);
    }
  };

  if (historyLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">채팅 기록을 불러오는 중...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      <div className="flex flex-col h-96">
        {/* 채팅 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">AI 학습 도우미</span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
                className="mr-1 h-3 w-3 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              문서 검색
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              기록 지우기
            </Button>
          </div>
        </div>

        {/* 채팅 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium">AI와 대화를 시작해보세요!</p>
              <p className="text-sm mt-2">궁금한 것이 있으면 언제든 물어보세요.</p>
              <div className="mt-4 text-xs text-gray-400">
                <p>💡 팁: 구체적인 질문을 하면 더 도움이 되는 답변을 받을 수 있어요</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.isUser
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1"></span>
                    )}
                  </div>
                  <div className="text-xs mt-1 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 메시지 입력 영역 */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
              rows={2}
              disabled={isLoading}
              maxLength={1000}
            />
            <div className="flex flex-col space-y-1">
              {isLoading ? (
                <Button
                  onClick={handleCancelRequest}
                  variant="outline"
                  size="sm"
                >
                  취소
                </Button>
              ) : (
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  size="sm"
                >
                  전송
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Enter로 전송, Shift+Enter로 줄바꿈
            </p>
            <p className="text-xs text-gray-400">
              {message.length}/1000
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}