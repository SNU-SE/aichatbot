import { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useSendMessage, useChatHistory } from '../../hooks/useChat';
import { useCurrentStudent } from '../../hooks/useStudents';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  created_at: string;
  isUser: boolean;
  content: string;
}

interface ChatInterfaceProps {
  activityId?: string;
  className?: string;
}

export default function ChatInterface({ activityId, className }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: student } = useCurrentStudent();
  const { data: chatHistory, isLoading: historyLoading } = useChatHistory(
    student?.id || '', 
    activityId
  );
  const sendMessageMutation = useSendMessage();

  // 채팅 기록을 로컬 메시지 형태로 변환
  useEffect(() => {
    if (chatHistory) {
      const messages: ChatMessage[] = [];
      chatHistory.forEach((chat) => {
        // 사용자 메시지
        messages.push({
          id: `${chat.id}-user`,
          message: chat.message,
          response: '',
          created_at: chat.created_at,
          isUser: true,
          content: chat.message,
        });
        // AI 응답
        messages.push({
          id: `${chat.id}-ai`,
          message: '',
          response: chat.response,
          created_at: chat.created_at,
          isUser: false,
          content: chat.response,
        });
      });
      setLocalMessages(messages);
    }
  }, [chatHistory]);

  // 메시지 목록 끝으로 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !student) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      message: message,
      response: '',
      created_at: new Date().toISOString(),
      isUser: true,
      content: message,
    };

    // 사용자 메시지를 즉시 표시
    setLocalMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage('');

    try {
      // AI 응답 대기 메시지 추가
      const loadingMessage: ChatMessage = {
        id: `loading-${Date.now()}`,
        message: '',
        response: 'AI가 응답을 생성하고 있습니다...',
        created_at: new Date().toISOString(),
        isUser: false,
        content: 'AI가 응답을 생성하고 있습니다...',
      };
      setLocalMessages(prev => [...prev, loadingMessage]);

      const response = await sendMessageMutation.mutateAsync({
        message: currentMessage,
        studentId: student.id,
        activityId,
        useRag: false,
      });

      // 로딩 메시지 제거하고 실제 응답 추가
      setLocalMessages(prev => {
        const filtered = prev.filter(msg => !msg.id.startsWith('loading-'));
        return [...filtered, {
          id: `ai-${Date.now()}`,
          message: '',
          response: response.response,
          created_at: new Date().toISOString(),
          isUser: false,
          content: response.response,
        }];
      });

    } catch (error) {
      console.error('Error sending message:', error);
      // 에러 메시지 표시
      setLocalMessages(prev => {
        const filtered = prev.filter(msg => !msg.id.startsWith('loading-'));
        return [...filtered, {
          id: `error-${Date.now()}`,
          message: '',
          response: '죄송합니다. 메시지 전송 중 오류가 발생했습니다.',
          created_at: new Date().toISOString(),
          isUser: false,
          content: '죄송합니다. 메시지 전송 중 오류가 발생했습니다.',
        }];
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
        {/* 채팅 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {localMessages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>AI와 대화를 시작해보세요!</p>
              <p className="text-sm mt-2">궁금한 것이 있으면 언제든 물어보세요.</p>
            </div>
          ) : (
            localMessages.map((msg) => (
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
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
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
              className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={2}
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              loading={sendMessageMutation.isPending}
            >
              전송
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter로 전송, Shift+Enter로 줄바꿈
          </p>
        </div>
      </div>
    </Card>
  );
}