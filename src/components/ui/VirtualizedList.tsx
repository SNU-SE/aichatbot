import { memo, useMemo } from 'react';
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import { areEqual } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number | ((index: number) => number);
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactElement;
  className?: string;
  overscanCount?: number;
  width?: string | number;
}

// 고정 높이 가상화 리스트
export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = '',
  overscanCount = 5,
  width = '100%',
}: VirtualizedListProps<T>) {
  const MemoizedItem = memo(({ index, style, data }: any) => {
    return renderItem({ index, style, data });
  }, areEqual);

  if (typeof itemHeight === 'number') {
    return (
      <List
        className={className}
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={items}
        overscanCount={overscanCount}
        width={width}
      >
        {MemoizedItem}
      </List>
    );
  }

  return (
    <VariableSizeList
      className={className}
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={items}
      overscanCount={overscanCount}
      width={width}
    >
      {MemoizedItem}
    </VariableSizeList>
  );
}

// 학생 목록용 가상화 컴포넌트
interface Student {
  id: string;
  name: string;
  class_name?: string;
  email?: string;
  created_at: string;
}

interface VirtualizedStudentListProps {
  students: Student[];
  onStudentClick?: (student: Student) => void;
  height?: number;
}

export const VirtualizedStudentList = memo(({
  students,
  onStudentClick,
  height = 400,
}: VirtualizedStudentListProps) => {
  const renderStudentItem = useMemo(() => 
    ({ index, style, data }: { index: number; style: React.CSSProperties; data: Student[] }) => {
      const student = data[index];
      
      return (
        <div
          style={style}
          className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
          onClick={() => onStudentClick?.(student)}
        >
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">{student.name}</h3>
            <p className="text-sm text-gray-500">{student.class_name || '미지정'}</p>
            {student.email && (
              <p className="text-xs text-gray-400">{student.email}</p>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(student.created_at).toLocaleDateString()}
          </div>
        </div>
      );
    }, [onStudentClick]);

  return (
    <VirtualizedList
      items={students}
      height={height}
      itemHeight={80}
      renderItem={renderStudentItem}
      className="border border-gray-200 rounded-lg"
    />
  );
});

VirtualizedStudentList.displayName = 'VirtualizedStudentList';

// 채팅 메시지용 가상화 컴포넌트
interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'ai';
  created_at: string;
  student_name?: string;
}

interface VirtualizedChatListProps {
  messages: ChatMessage[];
  height?: number;
}

export const VirtualizedChatList = memo(({
  messages,
  height = 500,
}: VirtualizedChatListProps) => {
  // 메시지 높이 계산 (동적 높이)
  const getItemHeight = useMemo(() => (index: number) => {
    const message = messages[index];
    if (!message) return 60;
    
    // 메시지 길이에 따른 높이 계산
    const baseHeight = 60;
    const lineHeight = 20;
    const charsPerLine = 50;
    const lines = Math.ceil(message.message.length / charsPerLine);
    
    return baseHeight + (lines - 1) * lineHeight;
  }, [messages]);

  const renderChatItem = useMemo(() => 
    ({ index, style, data }: { index: number; style: React.CSSProperties; data: ChatMessage[] }) => {
      const message = data[index];
      const isUser = message.sender === 'user';
      
      return (
        <div style={style} className="px-4 py-2">
          <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isUser
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {message.student_name && !isUser && (
                <p className="text-xs text-gray-600 mb-1">{message.student_name}</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
              <p className={`text-xs mt-1 ${isUser ? 'text-primary-100' : 'text-gray-500'}`}>
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      );
    }, []);

  return (
    <VirtualizedList
      items={messages}
      height={height}
      itemHeight={getItemHeight}
      renderItem={renderChatItem}
      className="bg-white"
      overscanCount={10}
    />
  );
});

VirtualizedChatList.displayName = 'VirtualizedChatList';

// 활동 목록용 가상화 컴포넌트
interface Activity {
  id: string;
  title: string;
  description?: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

interface VirtualizedActivityListProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
  height?: number;
}

export const VirtualizedActivityList = memo(({
  activities,
  onActivityClick,
  height = 400,
}: VirtualizedActivityListProps) => {
  const renderActivityItem = useMemo(() => 
    ({ index, style, data }: { index: number; style: React.CSSProperties; data: Activity[] }) => {
      const activity = data[index];
      
      return (
        <div
          style={style}
          className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
          onClick={() => onActivityClick?.(activity)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">{activity.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{activity.type}</p>
              {activity.description && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activity.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {activity.is_active ? '활성' : '비활성'}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(activity.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      );
    }, [onActivityClick]);

  return (
    <VirtualizedList
      items={activities}
      height={height}
      itemHeight={100}
      renderItem={renderActivityItem}
      className="border border-gray-200 rounded-lg"
    />
  );
});

VirtualizedActivityList.displayName = 'VirtualizedActivityList';