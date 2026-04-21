import React, { createContext, useContext, useState, useRef } from "react";
import { FlatList } from "react-native";

interface DragContextType {
  isDraggingTask: boolean;
  setIsDraggingTask: (isDragging: boolean) => void;
  draggedTaskId: string | null;
  setDraggedTaskId: (taskId: string | null) => void;
  columnRefs: Map<string, React.RefObject<FlatList<any> | null>>;
  registerColumnRef: (
    status: string,
    ref: React.RefObject<FlatList<any> | null>
  ) => void;
  autoScrollState: {
    scrolling: boolean;
    direction: "up" | "down" | null;
  };
  setAutoScrollState: (state: {
    scrolling: boolean;
    direction: "up" | "down" | null;
  }) => void;
  /** Live Y-translation of the card being dragged (updated every frame) */
  dragTranslationY: number;
  setDragTranslationY: (y: number) => void;
}

const DragContext = createContext<DragContextType>({
  isDraggingTask: false,
  setIsDraggingTask: () => {},
  draggedTaskId: null,
  setDraggedTaskId: () => {},
  columnRefs: new Map(),
  registerColumnRef: () => {},
  autoScrollState: { scrolling: false, direction: null },
  setAutoScrollState: () => {},
  dragTranslationY: 0,
  setDragTranslationY: () => {},
});

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [autoScrollState, setAutoScrollState] = useState({
    scrolling: false,
    direction: null as "up" | "down" | null,
  });
  const [dragTranslationY, setDragTranslationY] = useState(0);

  const columnRefsRef = useRef<
    Map<string, React.RefObject<FlatList<any> | null>>
  >(new Map());

  const registerColumnRef = (
    status: string,
    ref: React.RefObject<FlatList<any> | null>
  ) => {
    columnRefsRef.current.set(status, ref);
  };

  return (
    <DragContext.Provider
      value={{
        isDraggingTask,
        setIsDraggingTask,
        draggedTaskId,
        setDraggedTaskId,
        columnRefs: columnRefsRef.current,
        registerColumnRef,
        autoScrollState,
        setAutoScrollState,
        dragTranslationY,
        setDragTranslationY,
      }}
    >
      {children}
    </DragContext.Provider>
  );
};

export const useDragContext = () => useContext(DragContext);